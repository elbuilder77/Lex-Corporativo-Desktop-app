# Prompt Maestro de Desarrollo: Lex Corporativo Web Lite (Lead Magnet & Pay-Per-Use)

> **Instrucciones para el Agente de Desarrollo:**
> Actúa como un Desarrollador Full-Stack Senior especializado en aplicaciones web de alto rendimiento, IA legal y diseño UI/UX premium. Tu objetivo es construir la versión **Web Lite** de **Lex Corporativo** a partir del prototipo proporcionado, siguiendo estrictamente las especificaciones de negocio, arquitectura, branding y funcionalidad detalladas en este documento.

---

## 1. Misión y Modelo de Negocio

El objetivo principal de **Lex Corporativo Web Lite** es servir como un **Lead Magnet (Gancho de Conversión)** ultrarrápido y de baja fricción para promocionar y vender la **Estación de Trabajo Desktop de Lex Corporativo** (corpus y portafolio locales, con generación mediante la API propia del usuario).

### Reglas Comerciales Obligatorias:
1. **Cero Configuración de Usuario (Sin BYOK)**: El usuario NO debe ingresar llaves de API (API Keys). La aplicación web debe ofrecer una experiencia "llave en mano".
2. **Sin Suscripciones Recurrentes en Web**: No se cobran mensualidades en la web.
3. **Nivel Gratuito de Entrada (Gancho)**:
   * **3 a 5 consultas gratuitas** en el Chat RAG (Fiscal / Mercantil).
   * **1 análisis o generación de documento gratuito**.
4. **Modelo Pay-Per-Use (Pago por evento)**:
   * Si el usuario agota su cuota de prueba y no desea comprar la versión Desktop, puede pagar por evento mediante Stripe / MercadoPago (ej. paquete de consultas o análisis adicional).
5. **Funnel Estratégico hacia la versión Desktop**:
   * En cada interacción clave (límite de cuota, aviso de privacidad, exportación de dictamen), se deben desplegar llamadas a la acción (CTAs) invitando al usuario a adquirir la **Licencia Desktop Ilimitada Zero-Cloud**.

---

## 2. Branding y Sistema de Diseño (Design System)

Debes aplicar rigurosamente la identidad visual institucional de **Lex Corporativo**:

### A. Tipografía
* **Títulos, Cabeceras y Elegancia Jurídica**: `'Playfair Display Variable'`, Playfair Display, Georgia, serif.
* **Cuerpo, Formularios e Interfaz**: `'Manrope Variable'`, Manrope, system-ui, sans-serif.

### B. Paleta de Colores
* **Acento Dorado Corporativo**: `--color-legal-gold: #c5a059` (Hover: `#b38d47`, Dark: `#8e6d2b`).
* **Fondo / Shell Base**: Dark Shell (`#070b13` / `#090d16`), Light Body (`#f8fafc`), Slate 900 (`#0f172a`).
* **Módulo Mercantil**: Azul Profundo Navy (`#1e3a5f`, Light: `#2d5a8e`, Dark: `#0f2440`, BG: `#f0f4f8`).
* **Módulo Fiscal**: Verde Esmeralda Corporativo (`#1a3c34`, Light: `#2d6b5a`, Dark: `#0f2b23`, BG: `#f0fdf4`).

### C. Elevación y Radios
* **Bordes Redondeados**: Radios estandarizados (`sm: 6px`, `md: 8px`, `lg: 12px`, `xl: 16px`, `2xl: 20px`).
* **Sombras**: Utilitarios CSS `--shadow-card`, `--shadow-dialog` y `--shadow-premium` con transiciones suaves (`cubic-bezier(0.4, 0, 0.2, 1)`).

---

## 3. Arquitectura Técnica

```
┌────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React 19 / Vite)                      │
│  • UI del Prototipo + Tailwind CSS v4 + Framer Motion                  │
│  • Parsing local de PDF en navegador via pdfjs-dist                    │
│  • Motor de Plantillas Contratos (Handlebars en cliente)               │
│  • Almacenamiento Efímero (IndexedDB / LocalStorage)                   │
└────────────────────────────────────────────────────────────────────────┘
                                     │
                 (Peticiones API protegidas - Sin API Key expuesta)
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  BACKEND SERVERLESS PROXY & GATEKEEPER                  │
│               (Vercel Serverless / Cloudflare Workers)                  │
│  • Oculta la API Key oficial (Google Gemini API / OpenAI)               │
│  • Valida el conteo de cuota gratuita por sesión/fingerprint          │
│  • Procesa las consultas RAG sobre el corpus legislativo (LISR, CFF)  │
│  • Procesa cobros Pay-Per-Use vía Stripe Checkout                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Módulos y Funciones a Desarrollar

### Módulo 1: Chat RAG de Consulta Fiscal & Mercantil
* **Propósito**: Responder dudas jurídicas y fiscales abiertas fundamentadas en leyes mexicanas oficiales.
* **Componente Base**: Adaptar `FiscalConsultation.tsx`.
* **Comportamiento**:
  1. El usuario escribe una consulta (ej. *"¿Cómo aplico la deducción de viáticos según el Art. 27 LISR?"*).
  2. El frontend envía la consulta al Proxy Serverless.
  3. El backend realiza la recuperación de artículos (RAG) sobre el corpus (LISR, CFF, Ley IVA, Código de Comercio) e inyecta el contexto a la API de IA.
  4. La respuesta se muestra en formato Chat con citas legales formateadas y verificadas (`[CFF Art. 69-B - Verificado]`).
  5. **Abstención**: Si no hay fundamento legal suficiente en el corpus, el chat responde: *"El sistema se abstiene de responder al no localizar un fundamento legal oficial suficiente"*.
  6. **Control de Cuota**: Muestra un contador en la UI (*"Te quedan X consultas gratis"*).

### Módulo 2: Evaluador Express de Riesgos en Documentos
* **Propósito**: Auditoría rápida de riesgos en contratos o expedientes fiscales (PDF/Texto).
* **Componente Base**: Adaptar `DocumentAnalysisView.tsx`.
* **Comportamiento**:
  1. Permite cargar 1 archivo PDF (máx. 5MB) procesado en el navegador con `pdfjs-dist`.
  2. Envía el texto extraído al Proxy Serverless para clasificar riesgos en Materialidad (Art. 69-B), Deducibilidad (Art. 27) e IVA Acreditable.
  3. Muestra un panel de dictamen con semáforo de riesgo (Verde, Amarillo, Rojo), obligaciones detectadas y cláusulas faltantes.

### Módulo 3: Generador Express de Contratos (Drafting)
* **Propósito**: Creación instantánea de instrumentos legales mediante formularios.
* **Componente Base**: Adaptar `LegalEngineering.tsx` y `DraftingTemplatePicker.tsx`.
* **Comportamiento**:
  1. Presenta un catálogo de 6 plantillas esenciales:
     * Contrato de Arrendamiento
     * Prestación de Servicios Profesionales
     * Acuerdo de Confidencialidad (NDA)
     * Contrato de Mutuo con Interés
     * Acta de Asamblea Ordinaria
     * Convenio de Terminación Laboral
  2. El usuario llena un formulario (Wizard) guiado.
  3. El documento se ensambla en el navegador usando `Handlebars` **sin consumir tokens de IA**.
  4. Permite exportar/descargar el documento en `.pdf` o `.docx`.

### Módulo 4: Bóveda Efímera y Gestión de Casos
* Persistencia local en el navegador del usuario utilizando `IndexedDB` o `localStorage`.
* Permite guardar, importar y exportar expedientes en archivo `.json`.

---

## 5. Estrategia de Monetización y CTAs en la UI

Debes integrar 3 puntos de conversión estratégica hacia la **App Desktop**:

1. **Badge de Privacidad Zero-Cloud**:
   * Ubicación: Header o Sidebar.
   * Mensaje: *"Modo Web Lite (Procesamiento en Nube). Para privacidad total Zero-Cloud sin envío de datos a servidores, descarga Lex Corporativo Desktop."*
2. **Modal / Tarjeta de Agotamiento de Cuota**:
   * Al consumir las consultas/análisis gratuitos, bloquea el envío y muestra un modal con dos opciones:
     * **Opción A (Recomendada)**: *"Adquirir Licencia Desktop"* (Consultas e inferencia local ILIMITADA, sin costos por token).
     * **Opción B (Pay-Per-Use)**: *"Comprar paquete express de 5 consultas / 1 análisis en la Web"* ($XX MXN vía Stripe).
3. **Pie de Página en Documentos de Prueba**:
   * Al descargar un documento o dictamen en la versión gratuita, incluye una marca de agua discreta en el pie de página promocionando la versión Desktop.

---

## 6. Pasos de Ejecución para el Agente

1. **Inspección del Prototipo Existente**: Revisa las vistas de React, componentes y rutas en `src/renderer`.
2. **Conexión de Estilos**: Asegura que `index.css` y las variables de Tailwind v4 apliquen los colores Dorado Corporativo (`#c5a059`), Azul Mercantil y Verde Fiscal.
3. **Creación del Proxy Serverless**: Implementar los endpoints `/api/consultar-rag`, `/api/analizar-documento` y `/api/stripe-checkout` en Vercel Serverless o Cloudflare Workers.
4. **Implementación de Cuotas**: Crear el hook/store local (`useQuotaStore`) para contabilizar las 3 consultas RAG y 1 análisis de documento gratis.
5. **Ensamblado de Módulos**: Conectar el Chat RAG, Evaluador de Documentos y Generador de Contratos.
6. **Verificación de Conversión**: Probar que los modales de Pay-Per-Use y los botones de compra de la Licencia Desktop se activen correctamente al agotar los créditos de prueba.
