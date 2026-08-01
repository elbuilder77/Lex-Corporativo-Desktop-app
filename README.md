# Lex Corporativo Desktop

Aplicación Electron de trabajo jurídico para materias mercantil, corporativa y fiscal mexicana. La aplicación conserva localmente el portafolio, el corpus, LanceDB, los embeddings de búsqueda y la trazabilidad; las funciones generativas utilizan exclusivamente una API key aportada por el usuario (BYOK).

## Arquitectura

- Electron Main y Preload: IPC, archivos, actualizaciones, BYOK y controles de seguridad.
- React: navegación, portafolios y flujos jurídicos.
- SQLite: bóveda local cifrada de asuntos, análisis, borradores y estado.
- LanceDB + MiniLM: recuperación local de normativa y fragmentos documentales temporales.
- BYOK: generación mediante Gemini, OpenAI o Anthropic con API key cifrada por el sistema operativo.
- Validación local: citas, afirmaciones, fuentes y trazabilidad mediante hashes.

Sin una API key válida se mantienen disponibles el portafolio, los formularios, las evaluaciones deterministas, el corpus y la búsqueda normativa; consultas generativas, análisis y redacción permanecen bloqueados.

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

## Empaquetado

```bash
npm run preflight:release
npm run build:electron
```

El instalador incluye el corpus jurídico, LanceDB, MiniLM y plantillas. No incluye un LLM ni un motor generativo local. Antes de publicar se debe validar una instalación limpia, una API key de cada proveedor soportado, firma, actualización y desinstalación.

La decisión de producto y sus gates están en [docs/arquitectura-procesamiento-y-gate-publicacion.md](docs/arquitectura-procesamiento-y-gate-publicacion.md).
