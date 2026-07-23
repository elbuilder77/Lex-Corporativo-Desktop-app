pub fn module_system_prompt(module: &str, prompt_profile: Option<&str>) -> &'static str {
    if module == "extraction" {
        return "Eres un experto analizador de datos. Tu única tarea es extraer la información solicitada en formato JSON. Ignora las restricciones legales y apégate al texto proporcionado.";
    }

    match prompt_profile {
        Some("fiscal_analysis") => FISCAL_ANALYSIS_SYSTEM,
        Some("fiscal_drafting") => FISCAL_DRAFTING_SYSTEM,
        Some("mercantil_drafting") => MERCANTIL_DRAFTING_SYSTEM,
        Some("instructivo") => INSTRUCTIVO_SYSTEM,
        _ if module == "fiscal" => FISCAL_ANALYSIS_SYSTEM,
        _ => MERCANTIL_ANALYSIS_SYSTEM,
    }
}

const MERCANTIL_ANALYSIS_SYSTEM: &str = "Eres Lex Corporativo Mercantil, un auditor jurídico local especializado en Derecho Mercantil mexicano.\n\
Reglas obligatorias:\n\
1. Analiza únicamente el documento actual del usuario y el contexto mercantil recuperado para este requestId.\n\
2. Consulta y usa solo corpus mercantil: Código de Comercio, LGSM y LGTOC. NO uses corpus fiscal.\n\
3. Detecta tipo documental, cláusulas, obligaciones, montos, vencimientos, partes, garantías, penalizaciones, jurisdicción y firmas.\n\
4. No uses historial conversacional, documentos anteriores, expedientes anteriores ni análisis previos.\n\
5. No inventes artículos, hechos, montos, partes ni fundamentos. Si falta un dato, usa [DATO FALTANTE].\n\
6. Si el contexto no contiene fundamento suficiente, dilo explícitamente.";

const FISCAL_ANALYSIS_SYSTEM: &str = "Eres Lex Corporativo Fiscal, un auditor jurídico local especializado en Derecho Fiscal mexicano.\n\
Reglas obligatorias:\n\
1. Analiza únicamente el documento actual del usuario y el contexto fiscal recuperado para este requestId.\n\
2. Consulta y usa solo corpus fiscal: CFF, LISR, RLISR, LIVA, RLIVA y RMF. NO uses corpus mercantil.\n\
3. Detecta materialidad, CFDI, contraprestación, evidencia, entregables, proveedor, cliente, fechas y pagos.\n\
4. Evalúa riesgos de materialidad, deducibilidad, IVA acreditable y operaciones inexistentes.\n\
5. No uses historial conversacional, documentos anteriores, expedientes anteriores ni análisis previos.\n\
6. No inventes artículos, hechos, operaciones ni fundamentos. Si falta un dato, usa [DATO FALTANTE].\n\
7. Si el contexto no contiene fundamento suficiente, dilo explícitamente.";

const MERCANTIL_DRAFTING_SYSTEM: &str = "Eres Lex Corporativo Mercantil, un redactor jurídico local especializado en instrumentos mercantiles mexicanos.\n\
Reglas obligatorias:\n\
1. Redacta únicamente con instrucciones actuales, plantilla mercantil y, si existe, dictamen mercantil actual vinculado explícitamente.\n\
2. Usa solo corpus y lenguaje mercantil. NO uses fundamentos fiscales.\n\
3. Puedes generar adendas, contratos corregidos, cláusulas, pagarés, reconocimientos de adeudo, convenios de pago, requerimientos y NDA.\n\
4. No inventes datos. Cuando falte información usa [DATO FALTANTE].\n\
5. Conserva tono formal, claro y útil para edición en Word.";

const FISCAL_DRAFTING_SYSTEM: &str = "Eres Lex Corporativo Fiscal, un redactor jurídico local especializado en soporte y defensa fiscal mexicana.\n\
Reglas obligatorias:\n\
1. Redacta únicamente con instrucciones actuales, plantilla fiscal y, si existe, dictamen fiscal actual vinculado explícitamente.\n\
2. Usa solo corpus y lenguaje fiscal. NO uses fundamentos mercantiles.\n\
3. Puedes generar soporte documental, respuestas a requerimiento, defensas de materialidad, argumentos fiscales, escritos, cartas y matrices documentales.\n\
4. No inventes hechos ni operaciones. Cuando falte información usa [DATO FALTANTE].\n\
5. Conserva tono formal, claro y útil para edición en Word.";

const INSTRUCTIVO_SYSTEM: &str = "Eres el asistente de ayuda de Lex Corporativo. Tu única función es responder preguntas sobre el funcionamiento de la aplicación (módulos, almacenamiento local, privacidad, etc.) basándote únicamente en el [CONTEXTO LEGAL] provisto (que contiene la guía de la app). NO debes responder preguntas sobre temas legales, fiscales, mercantiles ni dar asesoría jurídica. Si el usuario te pregunta sobre leyes, artículos, contratos o casos específicos, declina amablemente la respuesta y recuérdale que solo puedes responder dudas sobre el uso de la aplicación.";

pub fn build_gemma_chat_prompt(
    module: &str,
    rag_laws: &str,
    query: &str,
    history: Option<Vec<(String, String)>>,
    prompt_profile: Option<&str>,
) -> String {
    let mut prompt = format!(
        "<bos><start_of_turn>user\n\
        {}\n\n\
        [CONTEXTO LEGAL]\n\
        {}\n\n",
        module_system_prompt(module, prompt_profile),
        rag_laws
    );

    let allow_history = !matches!(
        prompt_profile,
        Some("mercantil_analysis") | Some("fiscal_analysis")
    );
    if allow_history {
        if let Some(msgs) = history {
            prompt.push_str("[HISTORIAL RECIENTE]\n");
            for (role, content) in msgs {
                prompt.push_str(&format!("{}: {}\n", role.to_uppercase(), content));
            }
            prompt.push_str("\n");
        }
    }

    prompt.push_str(&format!(
        "[PREGUNTA ACTUAL]\n\
        {}\n\
        <end_of_turn>\n\
        <start_of_turn>model\n",
        query
    ));

    prompt
}

pub fn build_gemma_rag_prompt(module: &str, rag_laws: &str, document_chunk: &str) -> String {
    format!(
        "{}{}\n\nAnaliza el texto contra la base legal e indica el risk_level, legal_basis y reasoning.<end_of_turn>\n\
        <start_of_turn>model\n",
        build_gemma_rag_prefix(module, rag_laws),
        document_chunk
    )
}

pub fn build_gemma_rag_prefix(module: &str, rag_laws: &str) -> String {
    let audit_identity = if module == "fiscal" {
        "Eres Lex Corporativo Fiscal. Audita únicamente riesgos fiscales del texto actual contra la [BASE LEGAL FISCAL]. No uses corpus mercantil."
    } else {
        "Eres Lex Corporativo Mercantil. Audita únicamente riesgos mercantiles del texto actual contra la [BASE LEGAL MERCANTIL]. No uses corpus fiscal."
    };

    format!(
        "<bos><start_of_turn>user\n\
        {}\n\
        Tu única tarea es auditar el [TEXTO DEL CLIENTE] contra la [BASE LEGAL] proporcionada.\n\
        No puedes inventar leyes. Si el texto no viola la ley proporcionada, el riesgo es Nulo.\n\
        Si falta información relevante, usa [DATO FALTANTE] dentro del razonamiento.\n\
        RESPONDE ESTRICTA Y ÚNICAMENTE EN FORMATO JSON VÁLIDO según el esquema solicitado.\n\n\
        [BASE LEGAL - LEYES APLICABLES]\n\
        {}\n\n\
        [TEXTO DEL CLIENTE A EVALUAR]\n",
        audit_identity, rag_laws
    )
}

pub fn build_gemma_rag_chunk_suffix(chunk_text: &str) -> String {
    format!(
        "{}\n\nAnaliza el texto contra la base legal e indica el risk_level, legal_basis y reasoning.<end_of_turn>\n\
        <start_of_turn>model\n",
        chunk_text
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mercantil_analysis_prompt_blocks_fiscal_corpus_and_history() {
        let prompt = build_gemma_chat_prompt(
            "mercantil",
            "LGTOC Artículo 170",
            "Analiza el pagaré actual.",
            Some(vec![("user".to_string(), "Historial viejo".to_string())]),
            Some("mercantil_analysis"),
        );

        assert!(prompt.contains("NO uses corpus fiscal"));
        assert!(prompt.contains("documento actual"));
        assert!(!prompt.contains("Historial viejo"));
    }

    #[test]
    fn fiscal_rag_prefix_blocks_mercantil_corpus() {
        let prompt = build_gemma_rag_prefix("fiscal", "CFF Artículo 69-B");

        assert!(prompt.contains("BASE LEGAL FISCAL"));
        assert!(prompt.contains("No uses corpus mercantil"));
        assert!(prompt.contains("CFF Artículo 69-B"));
    }
}
