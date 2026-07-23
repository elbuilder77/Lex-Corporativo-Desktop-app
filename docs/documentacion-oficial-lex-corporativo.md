# Lex Corporativo Desktop - Documentacion Oficial

Version documental: RC8  
Fecha de corte: 2026-06-17  
Estado: Documento canonico de producto, operacion, privacidad, arquitectura y experiencia.

## 1. Definicion del producto

Lex Corporativo Desktop es una estacion juridica local para areas legales empresariales que trabajan con documentos mercantiles, corporativos y fiscales mexicanos.

La aplicacion instalada no es una pagina web ni un panel SaaS. Es una app desktop Electron que opera en la computadora del usuario, con Portafolio local, RAG juridico local, motor Rust/Gemma local y una opcion BYOK para usar Gemini con una API key propia del usuario o de la empresa.

El principio rector es:

- Modo local por defecto.
- Privacidad estricta por defecto.
- Documentos sensibles procesados localmente salvo autorizacion expresa del usuario para BYOK.
- Separacion funcional entre Mercantil y Fiscal.
- Portafolio local como memoria de actividad, no nube obligatoria.
- Dictamenes y documentos generados como apoyo profesional, no sustituto de revision legal.

## 2. Superficies principales

La aplicacion se organiza en cinco areas visibles:

| Area | Proposito |
| --- | --- |
| Inicio | Entrada a la estacion local e instructivo interactivo. |
| Portafolio | Historial local de actividades, dictamenes y documentos generados. |
| Mercantil | Analisis documental e ingenieria juridica mercantil. |
| Fiscal | Analisis documental e ingenieria juridica fiscal. |
| Configuracion | Perfil local, privacidad, Gemini BYOK, updates y sesion. |

Cada ecosistema operativo tiene dos flujos:

- Analisis Documental: revision de PDFs, extraccion de texto, RAG local y dictamen.
- Ingenieria Juridica: redaccion desde instruccion, plantilla o hallazgos previos.

## 3. Arquitectura tecnica

La app usa una arquitectura Electron de tres capas:

| Capa | Responsabilidad |
| --- | --- |
| Renderer React | Interfaz, navegacion, formularios, estados visuales, Portafolio y modulos. |
| Preload | Puente seguro `window.lexDesktop`; expone IPC sin habilitar Node en renderer. |
| Main process | IPC, SQLite, RAG, archivos, BYOK, updates, motor Rust y salud del runtime. |

La ventana principal opera con `contextIsolation`, `sandbox`, `nodeIntegration: false` y `webSecurity`. La comunicacion entre UI y backend se limita a la superficie expuesta por `src/preload/index.ts`.

Los servicios principales son:

- `src/main/ipc/analyze.handler.ts`: analisis documental.
- `src/main/ipc/draft.handler.ts`: ingenieria juridica y plantillas.
- `src/main/ipc/vault.handler.ts`: Portafolio y SQLite local.
- `src/main/ipc/byok.handler.ts`: configuracion y prueba de Gemini BYOK.
- `src/main/ipc/assistant.handler.ts`: asistente local del Instructivo.
- `src/main/lib/rag.ts`: LanceDB, embeddings locales y recuperacion juridica.
- `src/main/lib/rust-engine.ts`: puente hacia `lex-engine`.
- `src/main/lib/case-vault.ts`: boveda SQLite local.

## 4. Recursos locales

La app empaquetada debe incluir:

- `lex-engine.exe` en `resources/lex-engine`.
- Modelo GGUF esperado: `gemma-2-2b-it-Q4_K_M.gguf`.
- Modelo local de embeddings `Xenova/all-MiniLM-L6-v2`.
- Base legal LanceDB en `resources/lex-engine/lance_data`.
- Plantillas `.hbs` en `resources/plantillas`.
- Binarios nativos reconstruidos para Electron, especialmente `better-sqlite3` ABI 146 para Electron 42.

La salud del runtime se valida con `window.lexDesktop.runtime.getHealth()`. El estado ideal es `ready` con estos checks en verde:

- SQLite local.
- Base legal LanceDB.
- Motor Rust.
- Gemma 2B local.
- Modelo de embeddings.
- Gemini BYOK, si esta habilitado.
- Privacidad estricta.

## 5. Modo local sin API key

Sin API key configurada, Lex Corporativo opera localmente. En este modo:

- No se requiere internet para Portafolio, analisis documental o redaccion.
- PDFs y texto extraido permanecen en el equipo.
- El corpus juridico se consulta desde LanceDB local.
- Los embeddings se generan con modelo local.
- El razonamiento se ejecuta por medio del motor Rust/Gemma.
- El Portafolio se guarda en SQLite local.
- Gemini no participa.

### 5.1 Analisis Documental local

El flujo tecnico de analisis local es:

1. La UI envia el payload por `window.lexDesktop.analysis.analyzeDocument`.
2. Main valida el payload con Zod.
3. Se aceptan PDFs; los demas tipos permitidos por schema no se indexan como PDF.
4. El texto se extrae localmente.
5. Se calcula `contentHash`.
6. El documento se divide en chunks.
7. Los chunks se indexan temporalmente en LanceDB bajo `requestId`, `module` y `contentHash`.
8. Se recuperan fundamentos del corpus local filtrados por ecosistema.
9. El motor Rust evalua los chunks y produce hallazgos.
10. El motor local consolida el dictamen JSON final.
11. Se limpia el RAG temporal del documento.

El contrato de privacidad es que el documento de un analisis no debe contaminar el siguiente analisis. La separacion se apoya en `requestId` y `contentHash`.

### 5.2 Ingenieria Juridica local

En modo local, la redaccion usa dos caminos:

- Plantillas deterministas: para casos como pagare mercantil o escrito SAT, la app extrae datos estructurados con el motor local y ensambla el documento con Handlebars.
- Redaccion libre con RAG: la app recupera fundamentos locales y envia el prompt al motor Rust/Gemma.

Si faltan datos en la instruccion, el comportamiento ideal es marcar `[DATO FALTANTE]` y evitar inventar informacion.

### 5.3 Asistente del Instructivo

El asistente del Instructivo opera localmente. Usa una guia interna de funcionamiento de la app y el motor Rust. Su alcance es explicar el uso de Lex Corporativo; no debe dar asesoria legal ni analizar documentos.

## 6. Modo Gemini BYOK con API key

BYOK significa "Bring Your Own Key". El usuario o la empresa configura su propia API key de Gemini en Configuracion > IA y API.

Cuando BYOK esta activo y existe API key descifrable:

- Analisis Documental puede usar Gemini para el razonamiento principal.
- Ingenieria Juridica puede usar Gemini para redactar entregables.
- La app sigue usando extraccion local, RAG local y fundamentos locales antes de construir el prompt.
- El limite `maxInputChars` controla cuanto texto se envia a Gemini.
- Si Gemini falla por red, cuota, credenciales o disponibilidad, la app intenta volver al flujo local.

La API key se guarda en el perfil local de la app. Si `safeStorage` esta disponible, se cifra con proteccion del sistema operativo. La UI muestra huella de la key, no la key completa.

### 6.1 Datos que pueden salir con BYOK

Solo en operaciones BYOK pueden enviarse a Gemini:

- Instruccion del usuario.
- Fragmentos seleccionados del documento.
- Fundamentos recuperados localmente.
- Contexto minimo necesario para analizar o redactar.

No se envia el Portafolio completo ni toda la boveda local.

### 6.2 Decisiones de motor

| Configuracion | Motor esperado |
| --- | --- |
| BYOK desactivado | Motor local Rust/Gemma. |
| BYOK activado sin key valida | Flujo local efectivo; health BYOK no listo. |
| BYOK activado con key valida | Gemini para analisis/redaccion, con RAG local previo. |
| Gemini falla | Fallback local cuando la operacion lo permite. |

## 7. Portafolio y almacenamiento local

El Portafolio es la memoria local de trabajo. Usa SQLite por `better-sqlite3` en el main process.

Funciones actuales:

- Crear actividad.
- Listar actividades.
- Renombrar actividad.
- Cargar datos de actividad.
- Guardar analisis.
- Guardar borradores.
- Guardar documentos.
- Eliminar actividad.
- Exportar PDF desde la UI.

La boveda crea indices por `updatedAt` y por `caseId` en documentos, analisis y borradores. Los payloads se protegen con `safeStorage` cuando esta disponible; si no, se usa fallback local ofuscado.

El Portafolio no depende de Gemini. La API key solo afecta analisis y redaccion, no la persistencia local.

## 8. Ecosistema Mercantil

Mercantil esta orientado a documentos corporativos y comerciales:

- Contratos.
- Pagares.
- Convenios.
- NDA.
- Compraventas.
- Reconocimientos de adeudo.
- Actas y documentos societarios.
- Evidencia de cobranza.

El analisis mercantil busca partes, obligaciones, montos, vencimientos, garantias, penalizaciones, jurisdiccion, firmas, omisiones y fundamentos aplicables como Codigo de Comercio, LGSM y LGTOC.

La ingenieria juridica mercantil genera entregables desde instruccion libre, plantillas o hallazgos de analisis.

## 9. Ecosistema Fiscal

Fiscal esta orientado a soporte documental y cumplimiento:

- Materialidad.
- CFDI.
- Deducibilidad.
- IVA acreditable.
- Razon de negocios.
- Operaciones inexistentes.
- Requerimientos y respuestas ante autoridad.
- Expedientes fiscales de soporte.

El analisis fiscal identifica evidencia, contraprestacion, entregables, proveedor, cliente, fechas, pagos, riesgos 69-B y fundamentos fiscales del corpus local.

La ingenieria juridica fiscal genera escritos, respuestas y soportes documentales desde instruccion, plantilla o analisis previo.

## 10. UX y UI oficial

La experiencia debe sentirse como una estacion desktop profesional, compacta y premium.

Principios visuales:

- Primera pantalla con marca oficial visible.
- Entrada directa a la app; no landing page comercial.
- Rail lateral como columna vertebral del flujo.
- Jerarquia clara: Inicio, Portafolio, Mercantil, Fiscal, Configuracion.
- Texto compacto, no saturado.
- Iconos funcionales para acciones frecuentes.
- Distincion visual por ecosistema sin romper consistencia.
- Notificaciones no invasivas.
- Diagnostico local visible cuando falten recursos.

Flujo principal:

1. Splash local con logo oficial.
2. Boton Entrar.
3. Validacion de health.
4. Instructivo inicial.
5. Seleccion de Portafolio o ecosistema.
6. Analisis documental o ingenieria juridica.
7. Persistencia local automatica en Portafolio.
8. Exportacion o continuacion posterior.

## 11. Configuracion y privacidad

Configuracion concentra:

- Perfil local.
- Preferencias.
- IA y API.
- Privacidad estricta.
- Updates manuales o automaticos segun configuracion.
- Eliminacion de API key.
- Cierre de sesion local.

Privacidad estricta esta activa por defecto. En ese modo:

- No hay updates automaticos al iniciar.
- Gemini solo se usa si BYOK esta activo y existe API key.
- El modo local sigue siendo el comportamiento base.

## 12. Empaquetado y release

El release de escritorio debe generarse con:

```bash
npm run build:electron
```

Compuertas minimas antes de entregar instalador:

- `npm run lint`.
- `npm test`.
- `npm run build`.
- Build Rust release.
- `npm run build:electron`.
- Inspeccion de `release/win-unpacked/resources`.
- Smoke de app empaquetada con `runtime:get-health`.
- Smoke de `vault:list-cases`.
- Smoke de `vault:rename-case`.

Para RC8 se valido:

- Instalador NSIS generado.
- `better-sqlite3` empaquetado con ABI Electron 146.
- `lex-engine.exe` presente en recursos.
- GGUF, embeddings, LanceDB y plantillas incluidos.
- App empaquetada con health `ready`.

## 13. Limites actuales reconocidos

Estos puntos no invalidan RC8, pero deben tratarse como pendientes para una version ideal:

- Los tests Node no ejecutan pruebas de vault cuando `better-sqlite3` esta compilado para Electron; se requiere suite Electron-native.
- Gemini client necesita timeout/AbortController para evitar esperas indefinidas.
- El vault aun usa operaciones sincronas en main process; para volumen alto debe moverse a worker o cola.
- Se requiere limite explicito de tamano por archivo/base64.
- La extraccion PDF e indexacion RAG deben optimizarse para documentos grandes.
- La politica de fallback cuando `safeStorage` no este disponible debe mostrarse mejor al usuario empresarial.
- Se requiere manifiesto formal de release con hashes, versiones de corpus y recursos incluidos.

## 14. Criterio de producto terminado

Lex Corporativo Desktop se considera listo para una version estable cuando:

- La app empaquetada inicia en equipo limpio.
- Health queda `ready`.
- Analisis Mercantil y Fiscal funcionan offline.
- Ingenieria Juridica Mercantil y Fiscal funcionan offline.
- BYOK funciona con API key valida y falla con fallback local controlado.
- El Portafolio persiste, carga, renombra y elimina actividades.
- No hay promesas visibles que no correspondan al runtime real.
- La documentacion, el instalador y el comportamiento observado dicen lo mismo.

