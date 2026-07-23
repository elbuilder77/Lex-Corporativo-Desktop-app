# Arquitectura de procesamiento y gate de publicación

## Decisión de producto

Lex Corporativo Desktop será una estación híbrida:

1. **API propia (BYOK) como vía inmediata y de alta calidad.** El usuario elige Gemini, OpenAI o Anthropic, conserva su cuenta y configura una key que se cifra con el almacenamiento seguro del sistema operativo.
2. **Procesamiento local como capacidad privada y verificable.** No se prometerá como disponible si faltan el motor, el modelo GGUF, los embeddings o LanceDB.
3. **La aplicación no será BYOK-only.** Las funciones determinísticas, el portafolio SQLite, el corpus, la recuperación normativa y la trazabilidad siguen siendo locales. La inferencia generativa puede ejecutarse localmente o mediante la API elegida.

Esta arquitectura evita obligar a todos los equipos a cargar un modelo grande, conserva una ruta completamente privada y permite elegir calidad, costo y requisitos de hardware de forma explícita.

## Experiencia integrada

La estación de trabajo presenta primero el trabajo del usuario, no el estado técnico del runtime:

- continuidad mediante asuntos recientes;
- rutas por intención: preparar operación fiscal, crear o corregir un documento y buscar fundamento;
- navegación lateral siempre legible en escritorio;
- estado de procesamiento compacto y explicativo;
- formularios y borradores utilizables aunque la generación todavía no esté configurada;
- diálogo contextual al ejecutar una acción que requiere inferencia;
- configuración de API propia sin abandonar ni perder el trabajo actual;
- acceso al diagnóstico de instalación cuando se elige procesamiento local.

Los faltantes del runtime ya no ocupan la pantalla completa ni convierten herramientas completas en tarjetas de “no disponible”.

## Estado técnico comprobado

| Elemento | Estado | Evidencia o gate |
| --- | --- | --- |
| Electron main, preload y renderer | Integrado | TypeScript, pruebas y build de producción |
| Bóveda local SQLite | Integrada | smoke test Electron con autosave, reapertura, borrado y retención |
| Corpus fuente | Integrado | 9 ordenamientos, 4,573 disposiciones, sin duplicados ni artefactos de extracción |
| LanceDB y embeddings | Generados localmente | tabla `legal_knowledge` con 4,573 vectores |
| Recuperación jurídica | Aprobada | probes Mercantil/Fiscal y aislamiento entre módulos |
| Motor Rust | Compilado | `lex-engine.exe` release; el binario es un artefacto ignorado por Git |
| API propia | Integrada | configuración, cifrado, prueba de conexión y ejecución por proveedor |
| Catálogo BYOK | Actualizado | Gemini 3.5 Flash, GPT-5.6 Terra y Claude Sonnet 5; catálogo compartido por main y renderer |
| Guía de producto | Integrada | funciona con modo local o API propia y rechaza asesoría jurídica |
| Gate de fundamentación | Integrado | 13/13 casos semánticos y 5/5 casos de citas/afirmaciones; falla en modo cerrado |
| Modelo generativo local | Pendiente de decisión final | el runtime actual espera `gemma-2-2b-it-Q4_K_M.gguf`; el archivo no está presente |
| Instalador firmado | Pendiente | debe generarse después de cerrar el paquete local y validarse en una máquina limpia |

## Decisión pendiente sobre el modelo local

El código heredado apunta a Gemma 2 2B Q4. Ese artefacto no debe incorporarse por inercia si la edición final busca calidad jurídica comparable con los proveedores BYOK. Antes de sustituirlo por un modelo de 14B o mantenerlo como edición ligera se deben fijar y registrar:

- modelo, versión, cuantización y licencia exactos;
- hash SHA-256 y fuente oficial del artefacto;
- RAM mínima/recomendada, espacio y tiempo de primera respuesta;
- límite de contexto efectivo;
- resultados del conjunto de evaluación jurídica del repositorio;
- tamaño del instalador o estrategia de descarga posterior;
- política de actualización, rollback y eliminación del paquete.

Hasta cerrar esa decisión, `prebuild:electron` debe seguir fallando si el GGUF esperado no existe. Esto protege la promesa de producto y evita publicar un “modo local” incompleto.

Los IDs BYOK deben revisarse nuevamente antes de cada release. En junio de 2026 se retiró el default heredado `claude-sonnet-4-20250514`; el catálogo actual usa `claude-sonnet-5` y omite los parámetros de muestreo que ese modelo rechaza.

## Gates obligatorios antes de publicar

La aplicación se considera publicable únicamente cuando todos estos gates estén en verde:

1. `npm run lint`.
2. `npm test`.
3. `npm run test:rust`.
4. `npm run test:vault:electron`.
5. `npm run audit:corpus-governance:strict`.
6. `npm run audit:legal-knowledge`.
7. `npm run audit:legal-retrieval`.
8. `npm run eval:legal-rag`.
9. Modelo local seleccionado, verificado por hash y aprobado por evaluación.
10. `npm run build:electron` con todos los recursos incluidos.
11. Firma de código y actualización configuradas para el canal real.
12. Instalación, primera apertura, actualización, desinstalación y recuperación de datos probadas en una máquina Windows limpia.
13. `runtime:get-health` en estado listo tanto para el paquete local como para una configuración BYOK válida.

No se debe crear tag de release, publicar instalador ni presentar la aplicación como terminada mientras alguno de estos gates permanezca pendiente.
