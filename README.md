# Lex Corporativo Desktop

Estacion de trabajo juridica local para derecho mercantil, corporativo y fiscal mexicano.

Este repositorio contiene exclusivamente la aplicacion instalada Electron: interfaz React, procesos main/preload, backend local, motor Rust, corpus juridico y empaquetado multiplataforma. El sitio comercial y cualquier aplicacion web se mantienen fuera de este codigo.

## Principio de producto

La aplicacion instalada opera sin internet para portafolios, analisis y redaccion. Si el usuario activa BYOK desde Configuracion, la app puede conectarse a Gemini, OpenAI o Anthropic usando una API key propia. La privacidad estricta viene activa por defecto: no hay busqueda automatica de actualizaciones y cualquier revision de updates debe iniciarla el usuario.

## Guia operativa

La documentacion oficial, propuesta de implementacion, uso, privacidad y modos de IA esta en:

- `docs/documentacion-oficial-lex-corporativo.md`
- `docs/guia-operativa-lex-corporativo.md`
- `docs/privacidad-y-operacion-local.md`

## Runtime local

- Electron + React para la interfaz instalada.
- IPC `window.lexDesktop` como puente unico entre renderer y main process.
- Boveda local para portafolios y documentos.
- LanceDB local para recuperacion de contexto juridico.
- Motor Rust/SLM local para consulta, redaccion y analisis.
- BYOK multiproveedor opcional para analisis y redaccion con API key propia.
- Limite configurable de texto enviado al proveedor y fallback local cuando corresponde.

## Modulos

- Mercantil: consultas, contratos, plantillas predefinidas de proyeccion juridica, validacion de representacion, cobranza y paquetes documentales.
- Fiscal: materialidad, deducibilidad, IVA, razon de negocios, riesgo 69-B, plantillas predefinidas y dictamen local.
- Portafolio: administracion local de actividad reciente y documentos.

## Comandos de desarrollo

```bash
npm ci
npm run dev:desktop
npm run lint
npm test
npm run build
```

## Empaquetado

```bash
npm run build:electron
```

El paquete de escritorio debe incluir `lex-engine.exe`, modelos GGUF y datos LanceDB locales mediante `electron-builder.config.json`.
