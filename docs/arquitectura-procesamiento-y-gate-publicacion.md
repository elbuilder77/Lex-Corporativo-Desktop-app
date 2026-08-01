# Arquitectura de procesamiento y gate de publicación

## Decisión de producto

Lex Corporativo Desktop es una estación BYOK. La generación requiere una API key del usuario para Gemini, OpenAI o Anthropic. No se incluye ni se ofrece inferencia mediante GGUF, Rust o un LLM local.

Permanecen locales:

- bóveda SQLite y portafolio;
- corpus jurídico Mercantil y Fiscal;
- LanceDB y MiniLM;
- extracción y selección de fragmentos;
- reglas deterministas y CFDI;
- validación de citas y afirmaciones;
- trazabilidad mediante hashes.

En una operación generativa se transmiten por HTTPS la instrucción, los extractos documentales seleccionados, los fundamentos recuperados y el contrato de salida. No se transmiten el archivo binario original, la bóveda completa ni otros asuntos.

## Política de grounding

LanceDB y el corpus verificado son la fuente común de fundamentación. La API recibe hasta ocho disposiciones con extractos limitados y diversidad entre ordenamientos. Si no se recupera evidencia jurídica suficiente, la operación se abstiene antes de contactar al proveedor. Toda respuesta jurídica pasa después por validación local.

## Estado técnico

| Elemento | Estado |
| --- | --- |
| Electron main, preload y renderer | Integrado |
| Bóveda SQLite | Integrada y probada |
| Corpus fuente | 9 ordenamientos y 4,573 disposiciones |
| LanceDB y embeddings | Integrados |
| BYOK multiproveedor | Integrado |
| Validación de fundamentación | Integrada |
| Motor generativo local | Fuera del producto |
| Instalador firmado | Pendiente |

## Gates obligatorios

1. `npm run lint`.
2. `npm test`.
3. `npm run test:vault:electron`.
4. `npm run audit:corpus-governance:strict`.
5. `npm run audit:legal-knowledge`.
6. `npm run audit:legal-retrieval`.
7. `npm run eval:legal-rag`.
8. Pruebas reales de conexión y generación con Gemini, OpenAI y Anthropic.
9. `npm run preflight:release:strict`.
10. `npm run build:electron`.
11. Instalación, primera apertura, actualización y desinstalación en Windows limpio.
12. Firma, hash y manifiesto de release.

No se debe crear un release comercial mientras alguno de estos gates permanezca pendiente.
