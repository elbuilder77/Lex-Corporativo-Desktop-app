# Lex Corporativo Desktop

Aplicación Electron de trabajo jurídico local para materias mercantil, corporativa y fiscal mexicana. Laboral permanece fuera del producto hasta contar con un corpus oficial verificado.

Este repositorio contiene exclusivamente el producto instalado: renderer React, procesos main/preload, backend local, motor Rust, corpus jurídico, plantillas y configuración de empaquetado. El sitio comercial debe mantenerse en un repositorio separado.

## Estado real

La fuente corresponde a `1.0.0-rc.12`. El shell Electron, la bóveda SQLite, el frontend, el motor Rust y el corpus fuente pueden compilarse y probarse desde este repositorio. La estación ya ofrece dos modos de procesamiento: API propia (BYOK) y local. El modo local completo depende además de tres artefactos de runtime no incluidos en Git:

- `src-rust/target/release/lex-engine.exe`
- `src-rust/models/gemma-2-2b-it-Q4_K_M.gguf`
- `src-rust/lance_data/legal_knowledge.lance`

`runtime:get-health` es la fuente de verdad para distinguir una estación lista de una instalación degradada.

La interfaz no bloquea el trabajo por esos artefactos: permite preparar el asunto y solicita elegir/configurar el modo de procesamiento únicamente al ejecutar una acción generativa. El empaquetado sí conserva un gate estricto para impedir que se distribuya una edición que prometa procesamiento local sin incluirlo.

## Arquitectura

- Electron Main: IPC, archivos, actualizaciones, BYOK y coordinación del runtime.
- Preload: puente único `window.lexDesktop`, con renderer aislado de Node.
- React: navegación, portafolios y flujos jurídicos.
- SQLite: bóveda local de portafolios, análisis, borradores y estado.
- LanceDB + MiniLM: recuperación normativa y documentos temporales.
- Rust + GGUF: generación local mediante proceso hijo.
- API propia (BYOK): Gemini, OpenAI o Anthropic con API key cifrada por el sistema operativo.
- JSONL local: trazabilidad mediante hashes, fuentes y metadatos mínimos.

## Producto

- Estación de trabajo orientada a tareas, asuntos recientes y continuidad del trabajo.
- Consultas jurídicas Mercantil y Fiscal.
- Ingeniería Jurídica Mercantil y Corporativa.
- Flujo Fiscal: preparación, materialidad, deducibilidad, documentación y normativa.
- Portafolio local con autosave y exportación.
- Privacidad explícita por modo: local o API propia.

## Desarrollo

```bash
npm ci
npm run dev:desktop
npm run lint
npm test
npm run build
```

La gobernanza del corpus se valida con:

```bash
npm run ingest:local:offline
npm run manifest:legal-corpus
npm run audit:corpus-governance:strict
```

La ingesta y el manifiesto deben regenerarse juntos porque el hash de LanceDB forma parte del artefacto canónico de publicación.

## Empaquetado

```bash
npm run build:electron
```

El empaquetado requiere previamente el motor Rust, el GGUF, embeddings y LanceDB. No debe publicarse un instalador hasta comprobar `runtime:get-health` en una instalación limpia.

La decisión de producto, los gates de salida y el estado del modelo local se mantienen en [docs/arquitectura-procesamiento-y-gate-publicacion.md](docs/arquitectura-procesamiento-y-gate-publicacion.md).

## Diseño y comercialización

La identidad de la aplicación y la arquitectura recomendada para el sitio de comercialización están documentadas en [docs/identidad-branding-y-sitio-comercial.md](docs/identidad-branding-y-sitio-comercial.md).
