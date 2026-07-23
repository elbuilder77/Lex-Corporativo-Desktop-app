# Lex Corporativo Desktop - Guia operativa

Lex Corporativo Desktop es una estacion legal para areas juridicas de empresa. La app organiza el trabajo en Inicio, Portafolio, Mercantil, Fiscal y Configuracion, con dos flujos centrales por materia: Analisis Documental e Ingenieria Juridica.

## 1. Modos de IA

Lex Corporativo puede operar en dos modos:

### Modo local

Es el modo predeterminado. Usa los recursos instalados en la computadora:

- Motor local Rust.
- Modelo Gemma GGUF incluido en los recursos de la app.
- Base legal LanceDB local.
- Boveda local SQLite.
- Modelos de embeddings locales.

En este modo no se requiere internet para analizar documentos, generar borradores o administrar el Portafolio. El texto de documentos, dictamenes, borradores y actividad reciente permanece en la computadora del usuario.

### Modo Gemini BYOK

BYOK significa "Bring Your Own Key": el usuario o la empresa agrega su propia API key de Gemini desde Configuracion > IA y API.

Cuando esta opcion esta activa y la key es valida:

- Analisis Documental puede usar Gemini para el razonamiento principal.
- Ingenieria Juridica puede usar Gemini para generar entregables mas potentes.
- La app sigue usando el corpus local para recuperar fundamentos antes de enviar el prompt.
- La API key se guarda localmente cifrada con la proteccion del sistema operativo cuando `safeStorage` esta disponible.
- La cantidad maxima de texto enviado a Gemini puede limitarse desde Configuracion > IA y API para controlar costo y exposicion.
- Si Gemini no responde, la app continua con el motor local cuando sea posible.

Modelo predeterminado: `gemini-3.5-flash`.

### Privacidad estricta

La privacidad estricta esta activa por defecto. En ese modo:

- No se revisan actualizaciones automaticamente al iniciar.
- La busqueda de actualizaciones solo ocurre si el usuario presiona "Buscar actualizaciones".
- Gemini solo se usa si BYOK esta activo y existe API key guardada.
- El modo local sigue siendo el comportamiento base.

## 2. Que datos salen de la computadora

### En modo local

No se envia contenido documental a internet. El procesamiento ocurre con los recursos instalados localmente.

Permanecen en el equipo:

- PDFs cargados.
- Texto extraido.
- Fragmentos indexados temporalmente.
- Analisis generados.
- Documentos de Ingenieria Juridica.
- Portafolio y actividad reciente.
- API key, si existe, guardada en configuracion local.

### En modo Gemini BYOK

Solo cuando el usuario activa la opcion de API propia, Lex Corporativo se conecta a internet para llamar a Gemini.

En ese modo puede enviarse a Google:

- La instruccion del usuario.
- Fragmentos de texto extraidos del documento.
- Fundamentos locales recuperados desde el corpus.
- Contexto necesario para redactar o analizar.

No se envia la boveda completa ni el Portafolio completo. La app construye una solicitud por operacion y usa la API key configurada por el usuario.

La politica de almacenamiento, logs, retencion y uso de datos de Gemini depende de la cuenta, proyecto y condiciones aplicables de Google. Para documentos sensibles, use el modo local salvo que la empresa autorice expresamente el uso de su API key.

### Actualizaciones

La app no busca actualizaciones automaticamente cuando Privacidad estricta esta activa. El usuario puede iniciar una revision manual desde Configuracion > IA y API. Esa revision consulta el canal de actualizaciones configurado del producto, pero no envia documentos, portafolios ni contenido juridico.

## 3. Configurar API key de Gemini

1. Abrir Configuracion.
2. Entrar a IA y API.
3. Activar "Usar mi API key de Gemini para analisis y documentos".
4. Pegar la API key de Gemini.
5. Confirmar que el modelo sea `gemini-3.5-flash` o el modelo autorizado por la empresa.
6. Ajustar el limite de texto enviado a Gemini si la empresa requiere un tope menor.
7. Presionar "Probar conexion".
8. Si la prueba es correcta, presionar "Guardar".

La API key no se muestra despues de guardarse. La interfaz muestra una huella corta para confirmar que existe una key almacenada.

## 4. Eliminar API key

1. Abrir Configuracion > IA y API.
2. Presionar "Eliminar key".
3. La app desactiva Gemini BYOK y vuelve al modo local.

## 5. Como decide la app que motor usar

- Si Gemini BYOK esta desactivado: usa Gemma local.
- Si Gemini BYOK esta activado pero no hay API key valida: vuelve al modo local.
- Si Gemini BYOK esta activado y hay API key valida: usa Gemini para analisis y redaccion.
- Si Gemini falla por red, cuota, autorizacion o disponibilidad: usa el flujo local cuando la operacion lo permite.

## 6. Uso recomendado en empresas

Use modo local para:

- Documentos altamente confidenciales.
- Revision preliminar.
- Trabajo sin internet.
- Ambientes donde la empresa no ha autorizado proveedor externo.

Use Gemini BYOK para:

- Redacciones complejas.
- Documentos extensos.
- Analisis con mayor profundidad.
- Casos donde la empresa ya autorizo el uso de su propia cuenta Gemini.

## 7. Flujo principal

1. Entrar a Inicio para orientacion rapida.
2. Abrir Mercantil o Fiscal.
3. Usar Analisis Documental para revisar PDFs.
4. Usar Ingenieria Juridica para generar entregables desde cero, plantilla o analisis previo.
5. Revisar Portafolio para continuar actividad reciente y documentos generados.

## 8. Limites y responsabilidades

Lex Corporativo es una herramienta de soporte documental y juridico. No sustituye la revision profesional. Todo documento generado debe ser revisado por el area legal antes de enviarse, firmarse o usarse frente a terceros o autoridades.
