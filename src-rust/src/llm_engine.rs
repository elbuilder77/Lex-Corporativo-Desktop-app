use serde::{Deserialize, Serialize};
use std::path::Path;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::LlamaModel;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::sampling::LlamaSampler;

/// Enumeración restrictiva para los niveles de riesgo
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum RiskLevel {
    Alto,
    Medio,
    Bajo,
    Nulo,
}

/// Estructura de Salida esperada del LLM
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuditResult {
    pub risk_level: RiskLevel,
    pub legal_basis: Option<String>,
    pub reasoning: String,
}

#[allow(dead_code)]
const AUDIT_JSON_GBNF: &str = r#"
root ::= "{" ws "\"risk_level\"" ws ":" ws risk_level_enum "," ws "\"legal_basis\"" ws ":" ws string_or_null "," ws "\"reasoning\"" ws ":" ws string "}"
risk_level_enum ::= "\"Alto\"" | "\"Medio\"" | "\"Bajo\"" | "\"Nulo\""
string_or_null ::= "null" | string
string ::= "\""   ([^"\\] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\""
ws ::= [ \t\n]*
"#;

const GENERIC_JSON_GBNF: &str = r#"
root ::= object
value ::= object | array | string | number | ("true" | "false" | "null") ws
object ::= "{" ws (string ":" ws value ("," ws string ":" ws value)*)? "}" ws
array  ::= "[" ws (value ("," ws value)*)? "]" ws
string ::= "\"" ([^"\\] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))* "\"" ws
number ::= ("-"? ([0-9] | [1-9] [0-9]*)) ("." [0-9]+)? ([eE] [-+]? [0-9]+)? ws
ws ::= [ \t\n]*
"#;

pub struct LlmEngine {
    // Para Inferencia Real
    backend: Option<LlamaBackend>,
    model: Option<LlamaModel>,
    pub _model_name: String,
    pub is_mock: bool, 
}

impl LlmEngine {
    pub fn new<P: AsRef<Path>>(model_path: P) -> Result<Self, String> {
        let path_str = model_path.as_ref().to_string_lossy().into_owned();
        
        if !model_path.as_ref().exists() {
            eprintln!("[Rust Engine] Modelo GGUF no encontrado ({}). La generacion local quedara deshabilitada.", path_str);
            return Ok(Self {
                backend: None,
                model: None,
                _model_name: path_str,
                is_mock: true,
            });
        }

        // INFERENCIA REAL (Inicialización)
        let backend = LlamaBackend::init().map_err(|e| e.to_string())?;
        let params = LlamaModelParams::default();
        let model = LlamaModel::load_from_file(&backend, path_str.clone(), &params)
            .map_err(|e| format!("Error cargando modelo: {}", e))?;

        println!("[Rust Engine] Modelo GGUF cargado exitosamente en memoria.");
        Ok(Self {
            backend: Some(backend),
            model: Some(model),
            _model_name: path_str,
            is_mock: false,
        })
    }

    /// Construye el System Prompt calibrado con el tono jurídico de Lex Corporativo
    fn build_chat_prompt(
        &self,
        module: &str,
        rag_laws: &str,
        query: &str,
        history: Option<Vec<(String, String)>>,
        prompt_profile: Option<&str>,
    ) -> String {
        crate::legal_prompts::build_gemma_chat_prompt(module, rag_laws, query, history, prompt_profile)
    }

    fn build_rag_prompt(&self, module: &str, rag_laws: &str, document_chunk: &str) -> String {
        crate::legal_prompts::build_gemma_rag_prompt(module, rag_laws, document_chunk)
    }

    fn emit_stream_chunk(request_id: &str, chunk: &str, is_done: bool) {
        let response = serde_json::json!({
            "type": "STREAM_CHUNK",
            "requestId": request_id,
            "payload": { "chunk": chunk, "isDone": is_done }
        });
        println!("{}", serde_json::to_string(&response).unwrap());
        use std::io::Write;
        let _ = std::io::stdout().flush();
    }

    pub async fn evaluate_chunks_batch(&self, module: &str, rag_laws: &str, chunks: Vec<crate::DocumentChunk>, request_id: &str) {
        if self.is_mock || self.model.is_none() {
            let error_msg = "No se pudo procesar el lote porque el modelo local GGUF no esta instalado.".to_string();
            let response = serde_json::json!({
                "type": "ANALYSIS_BATCH_DONE",
                "requestId": request_id,
                "processedChunks": 0,
                "failedChunks": chunks.len(),
                "error": error_msg
            });
            println!("{}", serde_json::to_string(&response).unwrap());
            return;
        }

        let model = self.model.as_ref().unwrap();
        let backend = self.backend.as_ref().unwrap();
        let mut processed_chunks = 0;
        let mut failed_chunks = 0;

        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(Some(std::num::NonZeroU32::new(4096).unwrap()));

        let mut ctx = match model.new_context(backend, ctx_params) {
            Ok(c) => c,
            Err(e) => {
                println!("{}", serde_json::to_string(&serde_json::json!({
                    "type": "ANALYSIS_BATCH_DONE", "requestId": request_id, "error": format!("Error en contexto: {}", e)
                })).unwrap());
                return;
            }
        };

        let rag_prompt = crate::legal_prompts::build_gemma_rag_prefix(module, rag_laws);

        let rag_tokens = match model.str_to_token(&rag_prompt, llama_cpp_2::model::AddBos::Never) {
            Ok(t) => t,
            Err(e) => {
                println!("{}", serde_json::to_string(&serde_json::json!({
                    "type": "ANALYSIS_BATCH_DONE", "requestId": request_id, "error": format!("Error al tokenizar rag_laws: {}", e)
                })).unwrap());
                return;
            }
        };

        let rag_len = rag_tokens.len();
        let mut batch = LlamaBatch::new(rag_len.max(1), 1);
        for (i, token) in (0_i32..).zip(rag_tokens.iter()) {
            let is_last = i as usize == rag_len - 1;
            if let Err(e) = batch.add(*token, i, &[0], is_last) {
                println!("{}", serde_json::to_string(&serde_json::json!({
                    "type": "ANALYSIS_BATCH_DONE", "requestId": request_id, "error": format!("Error preparando batch: {}", e)
                })).unwrap());
                return;
            }
        }

        if let Err(e) = ctx.decode(&mut batch) {
            println!("{}", serde_json::to_string(&serde_json::json!({
                "type": "ANALYSIS_BATCH_DONE", "requestId": request_id, "error": format!("Error decodificando batch: {}", e)
            })).unwrap());
            return;
        }

        // KV cache of `rag_laws` is preserved up to index `rag_len`

        for chunk in chunks {
            let chunk_prompt = crate::legal_prompts::build_gemma_rag_chunk_suffix(&chunk.text);

            let chunk_tokens = match model.str_to_token(&chunk_prompt, llama_cpp_2::model::AddBos::Never) {
                Ok(t) => t,
                Err(e) => {
                    let err_msg = format!("Tokenize error: {}", e);
                    Self::emit_chunk_error(request_id, chunk.chunk_index, &err_msg);
                    failed_chunks += 1;
                    continue;
                }
            };

            let chunk_len = chunk_tokens.len();
            let mut chunk_batch = LlamaBatch::new(chunk_len.max(1), 1);

            for (i, token) in (0_i32..).zip(chunk_tokens.iter()) {
                let pos = rag_len as i32 + i;
                let is_last = i as usize == chunk_len - 1;
                if let Err(_) = chunk_batch.add(*token, pos, &[0], is_last) {
                    break;
                }
            }

            if let Err(e) = ctx.decode(&mut chunk_batch) {
                let err_msg = format!("Decode error: {}", e);
                Self::emit_chunk_error(request_id, chunk.chunk_index, &err_msg);
                failed_chunks += 1;
                let _ = ctx.clear_kv_cache_seq(None, Some(rag_len as u32), None); // reset on error just in case
                continue;
            }

            let grammar_sampler = match LlamaSampler::grammar(model, AUDIT_JSON_GBNF, "root") {
                Ok(g) => g,
                Err(e) => {
                    let err_msg = format!("Error compilando gramática JSON GBNF: {}", e);
                    Self::emit_chunk_error(request_id, chunk.chunk_index, &err_msg);
                    failed_chunks += 1;
                    let _ = ctx.clear_kv_cache_seq(None, Some(rag_len as u32), None);
                    continue;
                }
            };

            let mut sampler = LlamaSampler::chain_simple([
                grammar_sampler,
                LlamaSampler::temp(0.10),
            ]);
            sampler.accept_many(rag_tokens.iter().chain(chunk_tokens.iter()));

            let mut decoder = encoding_rs::UTF_8.new_decoder();
            let mut response_text = String::new();
            let mut next_position = (rag_len + chunk_len) as i32;
            let max_new_tokens = 512;

            let mut eval_failed = false;

            for _ in 0..max_new_tokens {
                let next_token = sampler.sample(&ctx, -1);
                sampler.accept(next_token);

                if model.is_eog_token(next_token) {
                    break;
                }

                if let Ok(piece) = model.token_to_piece(next_token, &mut decoder, false, None) {
                    response_text.push_str(&piece);
                }

                let mut next_batch = LlamaBatch::new(1, 1);
                if let Err(_) = next_batch.add(next_token, next_position, &[0], true) {
                    eval_failed = true;
                    break;
                }
                if let Err(_) = ctx.decode(&mut next_batch) {
                    eval_failed = true;
                    break;
                }
                next_position += 1;
            }

            // Restore KV Cache state back to right after rag_laws
            let _ = ctx.clear_kv_cache_seq(None, Some(rag_len as u32), None);

            if eval_failed {
                Self::emit_chunk_error(request_id, chunk.chunk_index, "Evaluación interrumpida.");
                failed_chunks += 1;
                continue;
            }

            match serde_json::from_str::<AuditResult>(&response_text) {
                Ok(parsed) => {
                    let response = serde_json::json!({
                        "type": "ANALYSIS_CHUNK_RESULT",
                        "requestId": request_id,
                        "chunkIndex": chunk.chunk_index,
                        "pageNumber": chunk.page_number,
                        "risk": parsed.risk_level,
                        "findings": [parsed.reasoning],
                        "citations": [parsed.legal_basis.unwrap_or_default()],
                        "error": null
                    });
                    println!("{}", serde_json::to_string(&response).unwrap());
                    processed_chunks += 1;
                }
                Err(e) => {
                    let err_msg = format!("Parse error: {} | Text: {}", e, response_text);
                    Self::emit_chunk_error(request_id, chunk.chunk_index, &err_msg);
                    failed_chunks += 1;
                }
            }
            use std::io::Write;
            let _ = std::io::stdout().flush();
        }

        let done_response = serde_json::json!({
            "type": "ANALYSIS_BATCH_DONE",
            "requestId": request_id,
            "processedChunks": processed_chunks,
            "failedChunks": failed_chunks
        });
        println!("{}", serde_json::to_string(&done_response).unwrap());
    }

    fn emit_chunk_error(request_id: &str, chunk_index: usize, error: &str) {
        let response = serde_json::json!({
            "type": "ANALYSIS_CHUNK_RESULT",
            "requestId": request_id,
            "chunkIndex": chunk_index,
            "risk": null,
            "findings": [],
            "citations": [],
            "error": error
        });
        println!("{}", serde_json::to_string(&response).unwrap());
        use std::io::Write;
        let _ = std::io::stdout().flush();
    }

    pub async fn evaluate_clause(&self, module: &str, rag_laws: &str, document_chunk: &str) -> Result<AuditResult, String> {
        let full_prompt = self.build_rag_prompt(module, rag_laws, document_chunk);

        if self.is_mock || self.model.is_none() {
            return Err("No se evaluo la clausula porque el modelo local GGUF no esta instalado. Para evitar dictamenes simulados, Lex Corporativo detuvo la auditoria estructurada hasta que exista un modelo local valido.".to_string());
        }

        let model = self.model.as_ref().unwrap();
        let backend = self.backend.as_ref().unwrap();

        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(Some(std::num::NonZeroU32::new(4096).unwrap()));

        let mut ctx = model.new_context(backend, ctx_params)
            .map_err(|e| format!("Error en contexto: {}", e))?;

        let tokens = model.str_to_token(&full_prompt, llama_cpp_2::model::AddBos::Never)
            .map_err(|e| format!("Error al tokenizar: {}", e))?;

        let prompt_len = tokens.len();
        let mut batch = LlamaBatch::new(prompt_len.max(1), 1);
        let last_index = prompt_len - 1;

        for (i, token) in (0_i32..).zip(tokens.iter()) {
            let is_last = i as usize == last_index;
            batch.add(*token, i, &[0], is_last)
                .map_err(|e| format!("Error preparando batch: {}", e))?;
        }

        ctx.decode(&mut batch).map_err(|e| format!("Error decodificando batch: {}", e))?;

        let grammar_sampler = LlamaSampler::grammar(model, AUDIT_JSON_GBNF, "root")
            .map_err(|e| format!("Error compilando gramática JSON GBNF: {}", e))?;

        let mut sampler = LlamaSampler::chain_simple([
            grammar_sampler,
            LlamaSampler::temp(0.10),
        ]);

        sampler.accept_many(tokens.iter());

        let mut decoder = encoding_rs::UTF_8.new_decoder();
        let mut response_text = String::new();
        let mut next_position = prompt_len as i32;
        let max_new_tokens = 512;

        for _ in 0..max_new_tokens {
            let next_token = sampler.sample(&ctx, -1);
            sampler.accept(next_token);

            if model.is_eog_token(next_token) {
                break;
            }

            if let Ok(piece) = model.token_to_piece(next_token, &mut decoder, false, None) {
                response_text.push_str(&piece);
            }

            let mut next_batch = LlamaBatch::new(1, 1);
            next_batch.add(next_token, next_position, &[0], true)
                .map_err(|e| format!("Error en siguiente token: {}", e))?;
            ctx.decode(&mut next_batch)
                .map_err(|e| format!("Error decodificando: {}", e))?;
            next_position += 1;
        }

        let parsed: AuditResult = serde_json::from_str(&response_text)
            .map_err(|e| format!("Error parseando JSON devuelto por modelo: {} | Texto: {}", e, response_text))?;

        Ok(parsed)
    }

    pub async fn stream_query(
        &self, 
        query: &str, 
        module: &str, 
        rag_context: &str, 
        request_id: &str, 
        abort_signal: std::sync::Arc<std::sync::atomic::AtomicBool>,
        grammar_str: Option<String>,
        temp: Option<f32>,
        history: Option<Vec<(String, String)>>,
        prompt_profile: Option<&str>
    ) {
        let full_prompt = self.build_chat_prompt(module, rag_context, query, history, prompt_profile);
        
        if self.is_mock || self.model.is_none() {
            let unavailable = "No se genero respuesta porque el modelo local GGUF no esta instalado en esta compilacion. Para evitar dictamenes simulados, Lex Corporativo detuvo la salida del asistente hasta que exista un modelo local valido en models/gemma-2-2b-it-Q4_K_M.gguf.";
            Self::emit_stream_chunk(request_id, unavailable, false);
        } else {
            // INFERENCIA REAL CON GGUF (STREAMING)
            let model = self.model.as_ref().unwrap();
            let backend = self.backend.as_ref().unwrap();
            
            let ctx_params = LlamaContextParams::default()
                .with_n_ctx(Some(std::num::NonZeroU32::new(4096).unwrap()));
                
            let mut ctx = match model.new_context(backend, ctx_params) {
                Ok(ctx) => ctx,
                Err(error) => {
                    Self::emit_stream_chunk(request_id, &format!("No se pudo inicializar el contexto local del modelo: {error}"), false);
                    Self::emit_stream_chunk(request_id, "", true);
                    return;
                }
            };

            let tokens = match model.str_to_token(&full_prompt, llama_cpp_2::model::AddBos::Never) {
                Ok(tokens) if !tokens.is_empty() => tokens,
                Ok(_) => {
                    Self::emit_stream_chunk(request_id, "No se genero respuesta porque el prompt local quedo vacio al tokenizarse.", false);
                    Self::emit_stream_chunk(request_id, "", true);
                    return;
                }
                Err(error) => {
                    Self::emit_stream_chunk(request_id, &format!("No se pudo tokenizar la consulta para el modelo local: {error}"), false);
                    Self::emit_stream_chunk(request_id, "", true);
                    return;
                }
            };

            let prompt_len = tokens.len();
            let mut batch = LlamaBatch::new(prompt_len.max(1), 1);
            let last_index = prompt_len - 1;

            for (i, token) in (0_i32..).zip(tokens.iter()) {
                let is_last = i as usize == last_index;
                if let Err(error) = batch.add(*token, i, &[0], is_last) {
                    Self::emit_stream_chunk(request_id, &format!("No se pudo preparar el prompt local: {error}"), false);
                    Self::emit_stream_chunk(request_id, "", true);
                    return;
                }
            }

            if let Err(error) = ctx.decode(&mut batch) {
                Self::emit_stream_chunk(request_id, &format!("El modelo local no pudo procesar el contexto: {error}"), false);
                Self::emit_stream_chunk(request_id, "", true);
                return;
            }

            Self::emit_stream_chunk(request_id, "Generando respuesta local...\n", false);

            let final_temp = temp.unwrap_or(0.10);
            let base_sampler = LlamaSampler::chain_simple([
                LlamaSampler::top_k(40),
                LlamaSampler::top_p(0.90, 1),
                LlamaSampler::temp(final_temp),
                LlamaSampler::dist(0x5EED),
            ]);

            let mut sampler = if let Some(custom_grammar) = grammar_str {
                match LlamaSampler::grammar(model, &custom_grammar, "root") {
                    Ok(grammar) => LlamaSampler::chain_simple([grammar, base_sampler]),
                    Err(e) => {
                        Self::emit_stream_chunk(request_id, &format!("Error compilando gramática dinámica: {}", e), false);
                        base_sampler
                    }
                }
            } else if module == "extraction" {
                if let Ok(grammar) = LlamaSampler::grammar(model, GENERIC_JSON_GBNF, "root") {
                    LlamaSampler::chain_simple([grammar, base_sampler])
                } else {
                    base_sampler
                }
            } else {
                base_sampler
            };

            sampler.accept_many(tokens.iter());

            let mut decoder = encoding_rs::UTF_8.new_decoder();
            let mut emitted_any = false;
            let mut next_position = prompt_len as i32;
            let max_new_tokens = 512;

            for _ in 0..max_new_tokens {
                if abort_signal.load(std::sync::atomic::Ordering::Relaxed) {
                    Self::emit_stream_chunk(request_id, "\n[Análisis abortado por el usuario]", false);
                    break;
                }

                let next_token = sampler.sample(&ctx, -1);
                sampler.accept(next_token);

                if model.is_eog_token(next_token) {
                    break;
                }

                if let Ok(piece) = model.token_to_piece(next_token, &mut decoder, false, None) {
                    if !piece.is_empty() {
                        emitted_any = true;
                        Self::emit_stream_chunk(request_id, &piece, false);
                    }
                }

                let mut next_batch = LlamaBatch::new(1, 1);
                if let Err(error) = next_batch.add(next_token, next_position, &[0], true) {
                    Self::emit_stream_chunk(request_id, &format!("\nLa generacion local se detuvo al preparar el siguiente token: {error}"), false);
                    break;
                }
                if let Err(error) = ctx.decode(&mut next_batch) {
                    Self::emit_stream_chunk(request_id, &format!("\nLa generacion local se detuvo durante el decodificado: {error}"), false);
                    break;
                }
                next_position += 1;
            }

            if !emitted_any {
                Self::emit_stream_chunk(request_id, "El modelo local cargo el contexto, pero no emitio tokens de salida para esta consulta.", false);
            }
        }

        // Emitir token final para cerrar el IPC
        Self::emit_stream_chunk(request_id, "", true);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn evaluate_clause_without_gguf_returns_error_instead_of_mock_audit() {
        let engine = LlmEngine::new("models/__missing_test_model__.gguf").unwrap();

        assert!(engine.is_mock);

        let result = engine
            .evaluate_clause(
                "mercantil",
                "Base mercantil esperada: Codigo de Comercio.",
                "Contrato con multa por retraso.",
            )
            .await;

        let error = result.expect_err("evaluate_clause must not emit a simulated audit without GGUF");
        assert!(error.contains("modelo local GGUF no esta instalado"));
        assert!(error.contains("evitar dictamenes simulados"));
        assert!(!error.contains("Cláusula validada"));
        assert!(!error.contains("Identificada potencial"));
    }
}
