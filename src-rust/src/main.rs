mod llm_engine;
mod legal_prompts;

use serde::Deserialize;
use std::io::{self, BufRead};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};
use std::collections::HashMap;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct LlmQueryRequest {
    request_id: String,
    payload: LlmQueryPayload,
}

#[derive(Deserialize, Debug, Clone)]
struct ChatHistoryMessage {
    role: String,
    content: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct LlmQueryPayload {
    module: String,
    query: String,
    #[serde(alias = "rag_context")]
    rag_context: Option<String>,
    history: Option<Vec<ChatHistoryMessage>>,
    grammar: Option<String>,
    temperature: Option<f32>,
    prompt_profile: Option<String>,
    workflow_module: Option<String>,
    current_document_only: Option<bool>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct EvaluateChunkRequest {
    payload: EvaluateChunkPayload,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct EvaluateChunkPayload {
    module: Option<String>,
    #[serde(alias = "rag_laws")]
    rag_laws: String,
    #[serde(alias = "document_chunk")]
    document_chunk: String,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct EvaluateChunksRequest {
    payload: EvaluateChunksPayload,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct EvaluateChunksPayload {
    module: Option<String>,
    #[serde(alias = "rag_laws")]
    rag_laws: String,
    chunks: Vec<DocumentChunk>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct DocumentChunk {
    #[serde(alias = "chunk_index")]
    chunk_index: usize,
    #[serde(alias = "page_number")]
    page_number: Option<usize>,
    text: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Inicialización GLOBAL del motor LLM para evitar recargar el GGUF por cada consulta
    let global_model_path = "models/gemma-2-2b-it-Q4_K_M.gguf";
    let llm_engine_global = match crate::llm_engine::LlmEngine::new(global_model_path) {
        Ok(engine) => Arc::new(engine),
        Err(e) => {
            eprintln!("[Rust Error] Error inicializando motor LLM global: {}", e);
            // Fallback a un engine mock si el modelo falla al cargar en el arranque
            Arc::new(crate::llm_engine::LlmEngine::new("non_existent").unwrap())
        }
    };

    // 🛡️ Registro de interruptores para cada consulta
    let active_tasks: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>> = Arc::new(Mutex::new(HashMap::new()));

    // Escucha infinita de comandos en stdin (síncrono por línea, pero despachamos asíncrono)
    let stdin = io::stdin();
    let mut iterator = stdin.lock().lines();

    while let Some(line) = iterator.next() {
        let raw_json = match line {
            Ok(val) => val,
            Err(_) => continue,
        };

        if raw_json.trim().is_empty() {
            continue;
        }

        if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(&raw_json) {
            let command = json_val["command"].as_str().unwrap_or("");
            let request_id = json_val["requestId"].as_str().unwrap_or("").to_string();

            if command == "CANCEL_QUERY" {
                let tasks = active_tasks.lock().unwrap();
                if let Some(abort_signal) = tasks.get(&request_id) {
                    abort_signal.store(true, Ordering::Relaxed);
                }
            } else if command == "LLM_QUERY" {
                match serde_json::from_value::<LlmQueryRequest>(json_val) {
                    Ok(request) => {
                        let abort_signal = Arc::new(AtomicBool::new(false));
                        {
                            let mut tasks = active_tasks.lock().unwrap();
                            tasks.insert(request_id.clone(), Arc::clone(&abort_signal));
                        }
                        
                        let engine_clone = Arc::clone(&llm_engine_global);
                        let tasks_clone = Arc::clone(&active_tasks);
                        let req_id_clone = request_id.clone();

                        tokio::spawn(async move {
                            process_llm_query(request, engine_clone, abort_signal).await;
                            
                            // Limpieza al terminar: Evitar Memory Leak en el mapa global
                            if let Ok(mut tasks) = tasks_clone.lock() {
                                tasks.remove(&req_id_clone);
                            }
                        });
                    }
                    Err(e) => {
                        // Evitar carga infinita en UI notificando el fallo de parsing inmediatamente
                        let err_msg = format!("Rust IPC Parse Error: {}", e);
                        let response = serde_json::json!({
                            "type": "STREAM_CHUNK",
                            "requestId": request_id,
                            "payload": { "chunk": err_msg, "isDone": true }
                        });
                        println!("{}", serde_json::to_string(&response).unwrap());
                    }
                }
            } else if command == "EVALUATE_CHUNK" {
                match serde_json::from_value::<EvaluateChunkRequest>(json_val.clone()) {
                    Ok(request) => {
                        let engine_clone = Arc::clone(&llm_engine_global);
                        let req_id_clone = request_id.clone();
                        tokio::spawn(async move {
                            let module = request.payload.module.as_deref().unwrap_or("mercantil");
                            match engine_clone.evaluate_clause(module, &request.payload.rag_laws, &request.payload.document_chunk).await {
                                Ok(audit_result) => {
                                    let response = serde_json::json!({
                                        "type": "EVALUATE_CHUNK_RESULT",
                                        "requestId": req_id_clone,
                                        "payload": audit_result
                                    });
                                    println!("{}", serde_json::to_string(&response).unwrap());
                                },
                                Err(e) => {
                                    let err_msg = format!("LLM Error: {}", e);
                                    let response = serde_json::json!({
                                        "type": "EVALUATE_CHUNK_ERROR",
                                        "requestId": req_id_clone,
                                        "payload": { "error": err_msg }
                                    });
                                    println!("{}", serde_json::to_string(&response).unwrap());
                                }
                            }
                        });
                    }
                    Err(e) => {
                        let err_msg = format!("Rust IPC Parse Error: {}", e);
                        let response = serde_json::json!({
                            "type": "EVALUATE_CHUNK_ERROR",
                            "requestId": request_id.clone(),
                            "payload": { "error": err_msg }
                        });
                        println!("{}", serde_json::to_string(&response).unwrap());
                    }
                }
            } else if command == "EVALUATE_CHUNKS" {
                match serde_json::from_value::<EvaluateChunksRequest>(json_val) {
                    Ok(request) => {
                        let engine_clone = Arc::clone(&llm_engine_global);
                        let req_id_clone = request_id.clone();

                        tokio::spawn(async move {
                            engine_clone.evaluate_chunks_batch(
                                request.payload.module.as_deref().unwrap_or("mercantil"),
                                &request.payload.rag_laws,
                                request.payload.chunks,
                                &req_id_clone
                            ).await;
                        });
                    }
                    Err(e) => {
                        let err_msg = format!("Rust IPC Parse Error (EVALUATE_CHUNKS): {}", e);
                        let response = serde_json::json!({
                            "type": "ANALYSIS_BATCH_DONE",
                            "requestId": request_id,
                            "processedChunks": 0,
                            "failedChunks": 0,
                            "error": err_msg
                        });
                        println!("{}", serde_json::to_string(&response).unwrap());
                    }
                }
            }
        }
    }

    Ok(())
}

/// Procesa una consulta individual de LLM usando streaming hacia Electron
async fn process_llm_query(request: LlmQueryRequest, llm_engine: Arc<crate::llm_engine::LlmEngine>, abort_signal: Arc<AtomicBool>) {
    let rag_laws = request.payload.rag_context.unwrap_or_else(|| "Sin contexto legal proporcionado. Advierte al usuario que no tienes acceso a la ley.".to_string());
    let _workflow_module = request.payload.workflow_module.as_deref().unwrap_or("chat");
    let _current_document_only = request.payload.current_document_only.unwrap_or(false);

    // Validar defensivamente el historial para no superar 4 mensajes
    let mut safe_history = None;
    if let Some(mut history) = request.payload.history {
        // Filtrar roles no permitidos por si acaso
        history.retain(|m| m.role == "user" || m.role == "assistant");
        if history.len() > 4 {
            let skip = history.len() - 4;
            safe_history = Some(history.into_iter().skip(skip).collect::<Vec<_>>());
        } else if !history.is_empty() {
            safe_history = Some(history);
        }
    }

    // Convertir a tuplas de (String, String) para el engine
    let engine_history = safe_history.map(|h| {
        h.into_iter().map(|msg| (msg.role, msg.content)).collect::<Vec<(String, String)>>()
    });

    // Ejecutar la inferencia con streaming usando el motor global
    llm_engine.stream_query(
        &request.payload.query, 
        &request.payload.module, 
        &rag_laws, 
        &request.request_id, 
        abort_signal,
        request.payload.grammar,
        request.payload.temperature,
        engine_history,
        request.payload.prompt_profile.as_deref()
    ).await;
}

