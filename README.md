# Lex Corporativo Desktop

Aplicación Electron de trabajo jurídico local para materias mercantil, corporativa y fiscal mexicana. Laboral permanece fuera del producto hasta contar con un corpus oficial verificado.

Este repositorio contiene exclusivamente el producto instalado: renderer React, procesos main/preload, backend local, motor Rust, corpus jurídico, plantillas y configuración de empaquetado. El sitio comercial debe mantenerse en un repositorio separado.

## Estado real

La fuente corresponde a `1.0.0-rc.12`. El shell Electron, la bóveda SQLite, el frontend y el corpus fuente pueden compilarse y probarse desde este repositorio. La disponibilidad de consultas, análisis y redacción local depende además de tres artefactos no incluidos en Git:

- `src-rust/target/release/lex-engine.exe`
- `src-rust/models/gemma-2-2b-it-Q4_K_M.gguf`
- `src-rust/lance_data/legal_knowledge.lance`

`runtime:get-health` es la fuente de verdad para distinguir una estación lista de una instalación degradada.

## Arquitectura

- Electron Main: IPC, archivos, actualizaciones, BYOK y coordinación del runtime.
- Preload: puente único `window.lexDesktop`, con renderer aislado de Node.
- React: navegación, portafolios y flujos jurídicos.
- SQLite: bóveda local de portafolios, análisis, borradores y estado.
- LanceDB + MiniLM: recuperación normativa y documentos temporales.
- Rust + GGUF: generación local mediante proceso hijo.
- BYOK opcional: Gemini, OpenAI o Anthropic con API key del usuario.
- JSONL local: trazabilidad mediante hashes, fuentes y metadatos mínimos.

## Producto

- Consultas jurídicas Mercantil y Fiscal.
- Ingeniería Jurídica Mercantil y Corporativa.
- Flujo Fiscal: preparación, materialidad, deducibilidad, documentación y normativa.
- Portafolio local con autosave y exportación.
- Privacidad estricta por defecto y BYOK opcional.

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
npm run audit:corpus-governance:strict
```

## Empaquetado

```bash
npm run build:electron
```

El empaquetado requiere previamente el motor Rust, el GGUF, embeddings y LanceDB. No debe publicarse un instalador hasta comprobar `runtime:get-health` en una instalación limpia.

## Diseño y comercialización

La identidad de la aplicación y la arquitectura recomendada para el sitio de comercialización están documentadas en [docs/identidad-branding-y-sitio-comercial.md](docs/identidad-branding-y-sitio-comercial.md).
