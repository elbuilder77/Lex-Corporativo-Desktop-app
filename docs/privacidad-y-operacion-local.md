# Privacidad y operacion local

Lex Corporativo Desktop esta diseñado para areas legales empresariales que necesitan trabajar con documentos sensibles sin depender de una nube obligatoria.

## Principio base

La app opera localmente por defecto. Sin activar Gemini BYOK, los documentos, textos extraidos, analisis, borradores, portafolios y actividad reciente permanecen en la computadora del usuario.

## Que funciona sin internet

- Analisis Documental.
- Ingenieria Juridica.
- Portafolio.
- Boveda local de casos y documentos.
- Recuperacion de fundamentos desde la base legal local.
- Trazabilidad local.

## Conexiones externas

La privacidad estricta esta activa por defecto. En ese modo:

- No se buscan actualizaciones automaticamente.
- No se envia contenido documental a internet.
- Gemini no se usa salvo que el usuario active BYOK y guarde una API key.

El usuario puede iniciar una busqueda manual de actualizaciones desde Configuracion > IA y API. Esa revision no envia documentos ni contenido juridico.

## Gemini BYOK

BYOK significa "Bring Your Own Key". La empresa o el usuario puede usar su propia API key de Gemini para analisis y redaccion asistida.

Cuando Gemini BYOK esta activo, Lex Corporativo puede enviar a Google:

- La instruccion del usuario.
- Fragmentos necesarios del documento.
- Fundamentos locales recuperados.
- Contexto minimo para la operacion solicitada.

No se envia el Portafolio completo ni la boveda completa. El limite de texto enviado a Gemini puede configurarse para controlar costo y exposicion.

## Fallback local

Si Gemini no responde por internet, cuota, credenciales o disponibilidad, la app intenta continuar con el motor local cuando la operacion lo permite.

## Recomendacion empresarial

Use modo local para documentos altamente confidenciales, revisiones preliminares y ambientes sin autorizacion de proveedor externo. Use Gemini BYOK solo cuando la empresa ya autorizo el uso de su propia cuenta/API key y acepta las condiciones aplicables de Google.
