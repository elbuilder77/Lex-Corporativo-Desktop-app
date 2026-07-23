# Identidad de producto y sitio comercial de Lex Corporativo Desktop

Estado: guía rectora de diseño y comunicación

Producto de referencia: Lex Corporativo Desktop `1.0.0-rc.12`

Alcance: identidad de la aplicación instalada y arquitectura recomendada para el sitio donde se comercializará y distribuirá.

## 1. Idea central de la marca

Lex Corporativo es una **estación jurídica local para trabajo legal empresarial**. No debe presentarse como un chatbot genérico, una base de datos de leyes ni un SaaS que obliga a cargar expedientes a una nube. Su diferencia está en reunir consulta normativa, análisis, redacción y portafolio dentro de una aplicación instalada con control visible sobre el procesamiento.

### Promesa principal

> Trabajo jurídico asistido, verificable y bajo control del equipo legal.

La promesa debe apoyarse siempre en capacidades comprobables. “Local” significa que la instalación contiene y tiene disponibles el motor, modelo y corpus necesarios. Cuando BYOK está activo, el producto debe explicar con precisión qué fragmentos se envían al proveedor elegido.

### Posicionamiento

- Categoría: software jurídico desktop para áreas legales y fiscales de empresa.
- Audiencia primaria: direcciones jurídicas, abogados corporativos, responsables fiscales y equipos de cumplimiento en México.
- Audiencia secundaria: despachos boutique con expedientes empresariales y consultores que requieren operación controlada.
- Trabajo que resuelve: consultar, preparar, analizar, redactar, conservar evidencia y exportar entregables.
- Diferenciadores: operación local, corpus jurídico gobernado, trazabilidad, flujos por materia y BYOK opcional.

### Personalidad

- Sobria, no fría.
- Experta, no grandilocuente.
- Precisa, no técnica de más.
- Institucional, no burocrática.
- Protectora de la información, sin promesas absolutas.
- Orientada a decisiones y entregables, no a conversación por sí misma.

## 2. Identidad visual existente

La identidad combina el lenguaje editorial de una firma jurídica con la eficiencia de una estación de trabajo.

### Símbolo

El isotipo es una balanza geométrica dorada construida alrededor de un eje vertical. Comunica equilibrio, estructura y criterio. Debe utilizarse como marca de aplicación, favicon, avatar y elemento de reconocimiento en superficies compactas.

### Logotipo

El lockup integra símbolo, nombre “Lex Corporativo” y la leyenda “Sistema de Inteligencia Jurídica”. En piezas comerciales puede usarse la leyenda; dentro de la aplicación conviene favorecer una versión compacta para no competir con la tarea activa.

Activos canónicos del repositorio:

- `src/renderer/assets/logo-mark.png`: isotipo para navegación e iconografía de producto.
- `src/renderer/assets/logo-lockup-transparent.png`: lockup principal para bienvenida, documentos y comunicación.
- `resources/icon.png`: icono de la aplicación y empaquetado.

Antes de construir el sitio comercial deben prepararse equivalentes vectoriales SVG, versiones monocromáticas y variantes sobre fondos claro y oscuro. No se debe reconstruir el símbolo con CSS ni usar aproximaciones tipográficas.

### Paleta principal

| Rol | Color | Uso recomendado |
| --- | --- | --- |
| Tinta institucional | `#0F172A` | Navegación, hero, encabezados oscuros y fondos premium. |
| Oro principal | `#C5A059` | Marca, acciones selectivas, foco y detalles de confianza. |
| Oro oscuro | `#8E6D2B` | Texto dorado sobre fondos claros y estados hover. |
| Papel | `#FFFFFF` | Superficies de trabajo, formularios y documentos. |
| Fondo operativo | `#F8FAFC` | Lienzo general y separación de paneles. |
| Texto secundario | `#576881` | Descripciones y metadatos con contraste suficiente. |

Paletas por materia:

| Materia | Base | Función |
| --- | --- | --- |
| Mercantil | `#1E3A5F` | Contratos, sociedades, cobranza y trabajo corporativo. |
| Fiscal | `#1A3C34` | Operaciones fiscales, evidencia, materialidad y cumplimiento. |

El oro es un acento, no un fondo dominante. Los verdes y azules distinguen contexto, pero la navegación y los componentes deben conservar la misma gramática visual.

### Tipografía

- Editorial: **Playfair Display**, para títulos de marca y encabezados selectivos.
- Operativa: **Manrope**, para navegación, formularios, tablas y texto funcional.
- Respaldo recomendado: Georgia para editorial y una sans del sistema para operación.

Las fuentes deben empaquetarse con licencias compatibles para garantizar consistencia offline. No debe dependerse de Google Fonts en tiempo de ejecución.

### Iconografía y fotografía

- Iconos lineales, simples y funcionales; Lucide es la biblioteca actual.
- Grosor visual consistente y sin mezclar familias.
- No usar emojis como iconografía de producto.
- Para el sitio, priorizar capturas reales de la aplicación y composiciones del producto.
- Evitar fotografías genéricas de mazos, tribunales o apretones de manos.
- Si se usa fotografía humana, debe mostrar trabajo jurídico empresarial contemporáneo, no teatralidad judicial.

## 3. Lenguaje de interfaz desktop

### Principios

1. **Flujo antes que módulo.** La interfaz debe ayudar a pasar de consulta a análisis, redacción, guardado y exportación.
2. **Estado visible.** El usuario debe entender si operará localmente, con BYOK o con capacidades degradadas.
3. **Densidad controlada.** Es una herramienta profesional compacta, pero ninguna información crítica debe depender de texto menor a 12 px.
4. **Evidencia cerca de la conclusión.** Fuentes, artículos y trazabilidad deben acompañar el resultado.
5. **Privacidad comprensible.** Explicar qué permanece local y qué puede enviarse en cada operación.
6. **Continuidad.** El Portafolio es el centro de memoria y reanudación del trabajo.
7. **Fail-closed legible.** Si faltan fundamentos o runtime, explicar la causa y la acción necesaria sin generar contenido simulado.

### Estructura visual

- Rail lateral azul tinta como columna vertebral.
- Área principal clara, semejante a papel de trabajo.
- Encabezados compactos con contexto de materia y actividad.
- Tarjetas con bordes discretos y sombras contenidas.
- Oro reservado para marca, foco y acciones de alto valor.
- Azul mercantil y verde fiscal como acentos contextuales.
- Esquinas moderadas; evitar una apariencia de app de consumo excesivamente redondeada.

### Flujos que definen el producto

- Entrada y comprobación de la estación.
- Consulta jurídica Mercantil/Fiscal.
- Ingeniería Jurídica desde plantilla o documento de referencia.
- Flujo Fiscal guiado por preparación, materialidad, deducibilidad, documentación y normativa.
- Portafolio para reanudar, revisar y exportar.
- Configuración de privacidad, runtime, BYOK y trazabilidad.

## 4. Voz y mensajes

### Tono

- Frases directas y breves.
- Verbos de trabajo: consultar, revisar, preparar, redactar, conservar, exportar.
- Explicar límites sin lenguaje defensivo.
- No llamar “dictamen definitivo” a una salida que requiere revisión profesional.
- Evitar “IA mágica”, “sin errores”, “100 % privado” o “reemplaza al abogado”.

### Ejemplos

Preferir:

- “Revisa la operación con fundamentos recuperados del corpus local.”
- “BYOK enviará al proveedor los fragmentos seleccionados para esta operación.”
- “El motor local no está instalado; esta función no puede ejecutarse todavía.”

Evitar:

- “Tus datos nunca salen de tu equipo” cuando BYOK puede estar activo.
- “Asesoría legal automática”.
- “Resultado garantizado”.
- “Funciona completamente offline” sin verificar el runtime del instalador.

## 5. Papel del sitio comercial

El sitio no debe duplicar la aplicación. Su trabajo es responder, en este orden:

1. Qué es Lex Corporativo.
2. Para quién está diseñado.
3. Qué resultados permite producir.
4. Cómo protege y procesa la información.
5. Qué necesita el equipo para instalarlo.
6. Cuánto cuesta y qué incluye la licencia.
7. Cómo descargar una versión auténtica y verificable.

Debe vivir en un repositorio separado, por ejemplo `Lex-Corp-Web`, y consumir metadatos de releases publicados en lugar de incluir binarios dentro del frontend web.

## 6. Arquitectura de información recomendada

### Navegación principal

| Sección | Objetivo |
| --- | --- |
| Producto | Explicar la estación, sus flujos y el Portafolio. |
| Soluciones | Traducir capacidades por tipo de equipo y trabajo. |
| Seguridad y privacidad | Mostrar arquitectura local, BYOK, trazabilidad y límites. |
| Recursos | Documentación, preguntas frecuentes, notas de versión y corpus. |
| Precios | Licencias, mantenimiento, soporte y condiciones. |
| Descargar | Compatibilidad, versión, firma, hashes e instalador. |

CTA persistente: **Descargar para Windows**.

CTA secundario: **Ver cómo funciona**.

### Mapa de páginas

```text
/
├── /producto
│   ├── /producto/consultas
│   ├── /producto/ingenieria-juridica
│   ├── /producto/fiscal
│   └── /producto/portafolio
├── /soluciones
│   ├── /soluciones/direccion-juridica
│   ├── /soluciones/corporativo-mercantil
│   ├── /soluciones/fiscal-cumplimiento
│   └── /soluciones/despachos
├── /seguridad-privacidad
├── /precios
├── /descargar
├── /recursos
│   ├── /recursos/documentacion
│   ├── /recursos/preguntas-frecuentes
│   ├── /recursos/notas-de-version
│   └── /recursos/corpus
├── /soporte
├── /privacidad
└── /terminos
```

No se recomienda crear `/cuenta` hasta que exista un contrato real de licencias, identidad y recuperación. Una cuenta decorativa aumentaría fricción y crearía expectativas que el producto desktop todavía no necesita.

## 7. Jerarquía de la página de inicio

### 1. Navegación

Logo, secciones principales, acceso a documentación y CTA de descarga. Debe ser sobria, corta y estable.

### 2. Hero

**Título sugerido:** “Trabajo jurídico empresarial, en una estación bajo tu control.”

**Descripción:** “Consulta fundamentos, revisa documentos, prepara operaciones fiscales y redacta entregables desde una aplicación instalada para equipos legales en México.”

Acciones:

- Primaria: Descargar para Windows.
- Secundaria: Ver el flujo del producto.

Visual: captura real de la pantalla más representativa, preferentemente Portafolio o un resultado con fuentes. No usar un dashboard inventado.

### 3. Franja de confianza

Cuatro afirmaciones demostrables:

- Procesamiento local disponible.
- Corpus jurídico gobernado.
- BYOK opcional y visible.
- Trazabilidad de fuentes y ejecución.

Las cifras de leyes, disposiciones y versión deben obtenerse del manifiesto de release para no quedar obsoletas.

### 4. Flujo de valor

Presentar el producto como secuencia:

**Consultar → Analizar → Redactar → Conservar y exportar**

Cada paso debe incluir una captura real, el resultado esperado y el dato que permanece en el equipo.

### 5. Capacidades principales

Agrupar por resultado, no por tecnología:

- Consulta normativa con fuentes.
- Revisión documental y hallazgos.
- Contratos y documentos desde plantillas.
- Preparación fiscal guiada.
- Portafolio local y continuidad.
- Exportación y trazabilidad.

RAG, embeddings, Rust y GGUF pertenecen a páginas técnicas o de seguridad; no deben dominar el primer mensaje comercial.

### 6. Soluciones por equipo

Tres entradas recomendadas:

- Dirección Jurídica: control, contratos, portafolios y trazabilidad.
- Corporativo/Mercantil: sociedades, títulos de crédito y documentos empresariales.
- Fiscal/Cumplimiento: materialidad, deducibilidad, IVA y soporte documental.

Laboral no debe mostrarse como capacidad disponible mientras no exista corpus laboral oficial verificado, trazabilidad afirmación-fuente y pruebas jurídicas equivalentes a Mercantil/Fiscal.

### 7. Seguridad y privacidad

Explicar con un diagrama real:

- Qué ocurre dentro de Electron.
- Dónde se guarda la bóveda.
- Qué necesita internet.
- Qué cambia al activar BYOK.
- Cómo se protegen claves y trazas.
- Qué datos elimina el usuario y qué conserva el desinstalador.

### 8. Evidencia de producto

Incluir sólo cuando exista una release completa:

- Sistemas operativos y arquitectura compatibles.
- Versión del corpus y fecha de corte.
- Firma del instalador.
- Hash SHA-256.
- Notas de versión.
- Estado de soporte.

### 9. Precios

La unidad comercial sugerida es **licencia por estación o por equipo**, no consumo de tokens, porque el producto base es local. BYOK debe presentarse como costo contratado directamente con el proveedor externo.

La página debe diferenciar:

- Licencia y actualizaciones incluidas.
- Número de instalaciones.
- Soporte y mantenimiento.
- Uso empresarial.
- BYOK y costos de terceros.

### 10. Cierre y FAQ

Repetir descarga y requisitos. La FAQ debe cubrir privacidad, internet, corpus, BYOK, compatibilidad, actualizaciones, respaldo y alcance profesional.

## 8. Página de descarga y distribución

La descarga es una superficie de confianza, no sólo un botón.

Contenido mínimo:

- Versión estable y fecha de publicación.
- Windows y arquitectura soportada.
- Requisitos de RAM, CPU, disco y sistema operativo.
- Tamaño del instalador.
- Estado de firma de código.
- SHA-256 del instalador.
- Enlace a notas de versión.
- Enlace a términos de licencia.
- Instrucciones de instalación y desinstalación.
- Canal de soporte.

### Flujo de conversión

1. Usuario confirma compatibilidad.
2. Revisa licencia, privacidad y tamaño.
3. Descarga el instalador firmado.
4. Puede comprobar el hash.
5. Instala y abre la estación.
6. La primera ejecución comprueba el runtime.
7. Si falta un recurso, ofrece una acción clara y no simula capacidades.

### Infraestructura sugerida

- Sitio comercial estático o SSR en infraestructura separada.
- Releases publicados desde CI, no copiados manualmente al repositorio web.
- Manifiesto JSON por release con versión, URL, tamaño, SHA-256, firma, requisitos y corpus.
- CDN o almacenamiento de artefactos con URLs versionadas.
- Canal estable inicialmente; beta y enterprise sólo cuando exista operación para sostenerlos.
- GitHub Releases puede servir para etapa privada o temprana; la distribución comercial debe añadir control de licencia, telemetría estrictamente opcional y soporte de revocación/actualización.

## 9. Features a comercializar

### Disponibles sólo con runtime completo

- Consulta jurídica Mercantil y Fiscal.
- Análisis documental fundamentado.
- Redacción local con modelo GGUF.
- Plantillas con extracción estructurada.
- Asistente del Instructivo.

### Disponibles desde la capa local de aplicación

- Portafolio y autosave.
- Flujos y formularios deterministas.
- Deducibilidad por reglas.
- Configuración y comprobación de recursos.
- Exportación y trazabilidad cuando existen resultados.

### Opcionales

- Gemini, OpenAI o Anthropic mediante BYOK.
- Actualizaciones automáticas cuando privacidad estricta lo permita.

El sitio debe construir sus claims desde esta matriz y el health real del instalador publicado.

## 10. Contenido y activos requeridos para construir la web

- Logo SVG y variantes monocromáticas.
- Favicon y app icon optimizados.
- Fuentes locales licenciadas.
- Capturas desktop a 1400 × 900 de los flujos principales.
- Video corto o secuencia de consulta a exportación.
- Diagrama de privacidad validado por ingeniería.
- Requisitos de sistema medidos.
- Instalador firmado, hash y notas de versión.
- Tabla comercial y términos de licencia.
- Aviso de privacidad coherente con BYOK y actualizaciones.

## 11. Reglas para mantener coherencia

- Una sola fuente de tokens visuales compartida entre app y web.
- Las capturas comerciales deben corresponder a la versión descargable.
- No publicar cifras del corpus escritas manualmente; leerlas del manifiesto.
- No presentar Laboral como corpus verificado hasta que exista esa cobertura.
- No prometer offline completo si el instalador no incluye motor, modelo y LanceDB.
- No ocultar BYOK dentro de términos: el modo activo debe ser visible en producto y sitio.
- No usar la estética genérica de “AI startup”; conservar papel, tinta, oro y materia jurídica empresarial.

## 12. Criterio de salida para el sitio

La web puede abrir comercialmente cuando existan, al mismo tiempo:

- Identidad vectorial final.
- Capturas reales aprobadas.
- Propuesta de licencia y precio.
- Instalador firmado y probado en equipo limpio.
- Manifiesto de release verificable.
- Página de seguridad revisada contra el comportamiento del producto.
- Flujo de descarga, soporte y actualización documentado.

Hasta entonces, la versión adecuada del sitio es una página privada o de lista de espera, no una promesa de disponibilidad general.
