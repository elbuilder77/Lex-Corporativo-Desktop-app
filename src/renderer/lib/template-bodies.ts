import type { DraftingTemplate } from './constants';

export const TEMPLATE_FULL_BODIES: Record<string, string> = {
  'mercantil-compraventa-bienes': `# CONTRATO DE COMPRAVENTA MERCANTIL DE BIENES
**Con estipulación de entrega, vicios ocultos y reserva de dominio**

**CONTRATO DE COMPRAVENTA MERCANTIL QUE CELEBRAN, POR UNA PARTE, [NOMBRE COMPLETO DEL VENDEDOR O RAZÓN SOCIAL DEL VENDEDOR], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL VENDEDOR", Y, POR LA OTRA, [NOMBRE COMPLETO DEL COMPRADOR O RAZÓN SOCIAL DEL COMPRADOR], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL COMPRADOR", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS.**

---

## DECLARACIONES

**I. Declara "EL VENDEDOR":**
- Ser una persona [FÍSICA/MORAL] legalmente constituida conforme a las leyes mexicanas, con Registro Federal de Contribuyentes [RFC DEL VENDEDOR] y domicilio en [DOMICILIO COMPLETO DEL VENDEDOR].
- Ser legítimo propietario de los bienes objeto del presente contrato y contar con facultades suficientes para enajenarlos.
- Que los bienes materia de la operación se encuentran libres de gravamen, carga, embargo o limitación de dominio, salvo lo expresamente pactado.

**II. Declara "EL COMPRADOR":**
- Ser una persona [FÍSICA/MORAL] legalmente constituida conforme a las leyes mexicanas, con Registro Federal de Contribuyentes [RFC DEL COMPRADOR] y domicilio en [DOMICILIO COMPLETO DEL COMPRADOR].
- Tener interés en adquirir los bienes descritos y contar con la capacidad económica y jurídica para obligarse en los términos del presente instrumento.

**III. Declaran ambas Partes:**
- Que es su voluntad celebrar el presente contrato de compraventa mercantil, de conformidad con lo dispuesto por los artículos 75 fracción I, 77, 78 y 371 del Código de Comercio, y de manera supletoria por el Código Civil Federal, en términos de su artículo 2º.
- Que reconocen la existencia y validez de las obligaciones que asumen.

---

## CLÁUSULAS

**PRIMERA. OBJETO.**  
"EL VENDEDOR" se obliga a transferir la propiedad de los bienes descritos a continuación, y "EL COMPRADOR" se obliga a pagar por ellos el precio pactado:

- **Descripción de la mercancía:** [DESCRIPCIÓN DETALLADA DE LA MERCANCÍA SEGÚN FRACCIÓN ARANCELARIA, MARCA, MODELO, NÚMERO DE SERIE, CANTIDAD, PESO, MEDIDAS Y/O ESPECIFICACIONES TÉCNICAS].
- **Cantidad:** [NÚMERO DE UNIDADES / KILOGRAMOS / LITROS / PIEZAS].
- **Fracción arancelaria aplicable, en su caso:** [FRACCIÓN ARANCELARIA].

**SEGUNDA. PRECIO.**  
El precio de la operación asciende a la cantidad de $[MONTO EN NÚMERO] ([MONTO EN LETRA] [MXN/USD]), más el Impuesto al Valor Agregado correspondiente, el cual será pagado por "EL COMPRADOR" de la siguiente forma:

- **Pago inicial:** $[MONTO] a la firma del presente contrato.
- **Saldo restante:** $[MONTO] mediante [TRANSFERENCIA ELECTRÓNICA, CHEQUE, DEPÓSITO] a la cuenta bancaria número [NÚMERO DE CUENTA BANCARIA] de la institución [NOMBRE DEL BANCO], con CLABE interbancaria [CLABE], a más tardar el [FECHA DD/MM/AAAA].

**TERCERA. ENTREGA.**  
La entrega material de los bienes se realizará en [DOMICILIO DE ENTREGA], el día [FECHA DD/MM/AAAA] o dentro de los [NÚMERO] días hábiles siguientes a la confirmación del pago inicial.  
En su caso, la entrega se sujetará a la regla Incoterms® [INCOTERM APLICABLE, EJ. FCA, CIF, DAP] de la Cámara de Comercio Internacional, versión 2020.  
El riesgo de pérdida o deterioro de los bienes se transmitirá a "EL COMPRADOR" en el momento y lugar de entrega pactados.

**CUARTA. RESERVA DE DOMINIO.**  
Las Partes pactan expresamente, con fundamento en el artículo 2312 del Código Civil Federal y demás disposiciones aplicables, que "EL VENDEDOR" conservará el dominio y la propiedad de los bienes vendidos hasta que "EL COMPRADOR" haya pagado la totalidad del precio y sus accesorios.  
Mientras subsista la reserva de dominio, "EL COMPRADOR" no podrá enajenar, gravar, arrendar, dar en comodato ni disponer de los bienes sin autorización expresa y por escrito de "EL VENDEDOR".

**QUINTA. VICIOS OCULTOS Y SANEAMIENTO.**  
"EL VENDEDOR" responderá por los defectos o vicios ocultos de los bienes que los hagan impropios para el uso al que se destinan, de conformidad con los artículos 2142 a 2155 del Código Civil Federal y disposiciones correlativas del Código de Comercio.  
El plazo para reclamar el saneamiento por vicios ocultos será de [NÚMERO] días naturales contados a partir de la recepción material de los bienes.

**SEXTA. OBLIGACIONES FISCALES Y ADUANERAS.**  
Cada Parte será responsable del cumplimiento de las obligaciones fiscales y aduaneras que le correspondan conforme a la legislación mexicana aplicable.

**SÉPTIMA. PENA CONVENCIONAL POR INCUMPLIMIENTO.**  
En caso de incumplimiento de cualquiera de las obligaciones pactadas, la Parte cumplidora podrá exigir a la Parte incumplida el pago de una pena convencional equivalente al [PORCENTAJE]% del valor total de la operación, sin perjuicio de exigir el cumplimiento forzoso o la rescisión del contrato.

**OCTAVA. RESCISIÓN.**  
Será causa de rescisión imputable el incumplimiento grave de las obligaciones pactadas, previa notificación por escrito con [NÚMERO] días naturales para subsanar.

**NOVENA. CONFIDENCIALIDAD.**  
Las Partes se obligan a guardar estricta confidencialidad respecto de la información comercial, técnica, financiera y operativa que conozcan con motivo del contrato.

**DÉCIMA. JURISDICCIÓN Y COMPETENCIA.**  
Para la interpretación, cumplimiento y controversias derivadas del presente contrato, las Partes se someten expresamente a la jurisdicción de los tribunales competentes de [CIUDAD/ESTADO], renunciando a cualquier fuero distinto que pudiere corresponderles en razón de su domicilio presente o futuro.

Leído que fue el presente contrato y enteradas las Partes de su contenido y alcance legal, lo firman por duplicado en [LUGAR], a los [DÍA] días del mes de [MES] del año [AÑO].

---

**"EL VENDEDOR"**  
________________________________________  
[NOMBRE Y FIRMA DEL REPRESENTANTE LEGAL O PERSONA FÍSICA]  
[RFC]

**"EL COMPRADOR"**  
________________________________________  
[NOMBRE Y FIRMA DEL REPRESENTANTE LEGAL O PERSONA FÍSICA]  
[RFC]
`,

  'mercantil-distribucion-comercial': `# CONTRATO DE DISTRIBUCIÓN COMERCIAL

**CONTRATO DE DISTRIBUCIÓN COMERCIAL QUE CELEBRAN, POR UNA PARTE, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL FABRICANTE/PROVEEDOR], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL PROVEEDOR", Y, POR LA OTRA, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL DISTRIBUIDOR], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL DISTRIBUIDOR", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS.**

---

## DECLARACIONES

**I. Declara "EL PROVEEDOR":**
- Ser una [PERSONA FÍSICA/MORAL] legalmente constituida conforme a las leyes mexicanas, con Registro Federal de Contribuyentes [RFC DEL PROVEEDOR] y domicilio en [DOMICILIO COMPLETO].
- Ser fabricante o titular de los derechos de distribución de los productos objeto del contrato.

**II. Declara "EL DISTRIBUIDOR":**
- Ser una [PERSONA FÍSICA/MORAL] legalmente constituida conforme a las leyes mexicanas, con Registro Federal de Contribuyentes [RFC DEL DISTRIBUIDOR] y domicilio en [DOMICILIO COMPLETO].
- Contar con infraestructura, red comercial y capacidad financiera para distribuir los productos.

**III. Declaran ambas Partes:**
- Que es su voluntad celebrar el presente contrato de distribución comercial de conformidad con los artículos 75, 77 y 78 del Código de Comercio, sin que exista subordinación laboral ni sociedad entre las Partes.
- Que las restricciones de competencia pactadas serán proporcionales y no constituirán prácticas monopólicas prohibidas por la Ley Federal de Competencia Económica.

---

## CLÁUSULAS

**PRIMERA. PRODUCTOS.**  
El presente contrato tiene por objeto la distribución de los productos siguientes:
- **Descripción:** [DESCRIPCIÓN DETALLADA DE LOS PRODUCTOS].
- **Marcas:** [MARCAS Y MODELOS].
- **Normas y especificaciones:** [NORMAS APLICABLES].

**SEGUNDA. TERRITORIO Y EXCLUSIVIDAD.**  
La distribución se realizará en el territorio siguiente: [TERRITORIO ASIGNADO, EJ. REPÚBLICA MEXICANA, CIERTOS ESTADOS O REGIONES].  
La exclusividad será [EXCLUSIVA / NO EXCLUSIVA]. En caso de exclusividad, "EL PROVEEDOR" no podrá designar a otros distribuidores en el territorio.  
"EL DISTRIBUIDOR" se obliga a no vender fuera del territorio sin autorización previa.

**TERCERA. PEDIDOS Y ENTREGA.**  
"EL DISTRIBUIDOR" presentará pedidos por escrito, los cuales serán confirmados por "EL PROVEEDOR".  
La entrega se realizará en [DOMICILIO DE ENTREGA], dentro de los [NÚMERO] días hábiles siguientes a la aceptación del pedido.

**CUARTA. PRECIOS Y CONDICIONES DE PAGO.**  
Los precios de los productos serán [LISTA DE PRECIOS ANEXA / PRECIO ACORDADO POR PEDIDO].  
El pago se realizará mediante [TRANSFERENCIA, CHEQUE, DEPÓSITO] dentro de los [NÚMERO] días siguientes a la emisión de la factura correspondiente.  
En caso de mora, se generarán intereses a razón del [PORCENTAJE]% mensual.

**QUINTA. OBLIGACIONES DEL DISTRIBUIDOR.**  
- Distribuir y comercializar los productos en el territorio asignado.
- Mantener un inventario razonable de los productos.
- Promocionar los productos y prestar servicio al cliente.
- Respetar las políticas de marca, precios y publicidad del proveedor.

**SEXTA. OBLIGACIONES DEL PROVEEDOR.**  
- Suministrar los productos en la cantidad y calidad pactadas.
- Proporcionar material publicitario y soporte técnico.
- Garantizar la legalidad de la comercialización de los productos.

**SÉPTIMA. NO SUBORDINACIÓN LABORAL.**  
Las Partes son independientes. Ningún empleado del distribuidor tendrá relación laboral con el proveedor.  
El distribuidor será responsable exclusivo de sus obligaciones laborales, fiscales y de seguridad social.

**OCTAVA. CONFIDENCIALIDAD Y PROPIEDAD INTELECTUAL.**  
Las marcas, nombres comerciales y logotipos son propiedad exclusiva del proveedor. El distribuidor no podrá usarlos salvo para los fines del presente contrato.

**NOVENA. VIGENCIA Y TERMINACIÓN.**  
El contrato tendrá vigencia de [NÚMERO] años/meses, contados a partir de la firma.  
Cualquiera de las Partes podrá darlo por terminado sin responsabilidad mediante aviso por escrito con [NÚMERO] días de anticipación.

**DÉCIMA. JURISDICCIÓN.**  
Para la interpretación y cumplimiento del presente contrato, las Partes se someten a los tribunales competentes de [CIUDAD/ESTADO], renunciando a cualquier fuero distinto.

Leído que fue el presente contrato y enteradas las Partes, lo firman por duplicado en [LUGAR], a los [DÍA] días del mes de [MES] del año [AÑO].

---

**"EL PROVEEDOR"**  
________________________________________  
[NOMBRE Y FIRMA]

**"EL DISTRIBUIDOR"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'mercantil-comision-mercantil': `# CONTRATO DE COMISIÓN MERCANTIL
**Con cálculo de comisiones, no subordinación laboral, territorio y rendición de cuentas**

**CONTRATO DE COMISIÓN MERCANTIL QUE CELEBRAN, POR UNA PARTE, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL COMITENTE], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL COMITENTE", Y, POR LA OTRA, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL COMISIONISTA], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL COMISIONISTA", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS.**

---

## DECLARACIONES

**I. Declara "EL COMITENTE":**
- Ser una [PERSONA FÍSICA/MORAL] legalmente constituida conforme a las leyes mexicanas, con Registro Federal de Contribuyentes [RFC DEL COMITENTE] y domicilio en [DOMICILIO COMPLETO DEL COMITENTE].
- Dedicarse a [DESCRIPCIÓN DE LA ACTIVIDAD COMERCIAL], y requerir los servicios de un comisionista para la promoción, venta o intermediación de [PRODUCTOS/SERVICIOS].

**II. Declara "EL COMISIONISTA":**
- Ser una [PERSONA FÍSICA/MORAL] legalmente constituida conforme a las leyes mexicanas, con Registro Federal de Contribuyentes [RFC DEL COMISIONISTA] y domicilio en [DOMICILIO COMPLETO DEL COMISIONISTA].
- Contar con experiencia, infraestructura y capacidad para desempeñar la comisión mercantil encomendada de forma independiente, sin subordinación laboral.

**III. Declaran ambas Partes:**
- Que es su voluntad celebrar el presente contrato de conformidad con los artículos 75, 77, 273, 274, 276, 279 y demás aplicables del Código de Comercio.
- Que no existe entre las Partes una relación de trabajo, por no reunirse los elementos de subordinación y dependencia previstos en la Ley Federal del Trabajo.

---

## CLÁUSULAS

**PRIMERA. OBJETO.**  
"EL COMITENTE" encomienda a "EL COMISIONISTA" la realización de los siguientes actos de comercio: [DESCRIBIR OPERACIONES ENCOMENDADAS, EJ. LA PROMOCIÓN, NEGOCIACIÓN Y CIERRE DE VENTAS DE LOS PRODUCTOS PROPIEDAD DEL COMITENTE].

**SEGUNDA. CARÁCTER DE LA COMISIÓN.**  
"EL COMISIONISTA" desempeñará la comisión en [NOMBRE PROPIO / NOMBRE DEL COMITENTE], conforme al artículo 274 del Código de Comercio.

**TERCERA. TERRITORIO.**  
La comisión se desempeñará en el territorio siguiente: [TERRITORIO ASIGNADO, EJ. CIUDAD DE MÉXICO, REPÚBLICA MEXICANA].

**CUARTA. CÁLCULO Y PAGO DE COMISIONES.**  
"EL COMISIONISTA" tendrá derecho a una comisión del [PORCENTAJE]% sobre el valor neto de las operaciones efectivamente cobradas.  
Las comisiones serán pagadas dentro de los [NÚMERO] días siguientes a la recepción del pago por parte del cliente final, a la cuenta [NÚMERO DE CUENTA] con CLABE [CLABE] de [BANCO].

**QUINTA. RENDICIÓN DE CUENTAS.**  
"EL COMISIONISTA" se obliga a rendir cuentas por escrito a "EL COMITENTE" dentro de los primeros [NÚMERO] días naturales de cada mes, acompañando la relación de operaciones realizadas y pedidos gestionados.

**SEXTA. NO SUBORDINACIÓN LABORAL.**  
Las Partes reconocen que la relación jurídica derivada del presente contrato es exclusivamente mercantil y no laboral. "EL COMISIONISTA" no estará sujeto a jornada, horario ni subordinación jerárquica.

**SÉPTIMA. CONFIDENCIALIDAD.**  
Las Partes guardarán confidencialidad sobre la información comercial, listas de clientes, precios y secretos industriales que conozcan con motivo del contrato.

**OCTAVA. VIGENCIA Y JURISDICCIÓN.**  
El presente contrato tendrá vigencia de [NÚMERO] meses/años. Para su interpretación y cumplimiento, las Partes se someten a los tribunales competentes de [CIUDAD/ESTADO].

Leído que fue el presente contrato, lo firman por duplicado en [LUGAR], a los [DÍA] días del mes de [MES] del año [AÑO].

---

**"EL COMITENTE"**  
________________________________________  
[NOMBRE Y FIRMA]

**"EL COMISIONISTA"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'mercantil-cesion-propiedad-intelectual': `# CONTRATO DE CESIÓN DE DERECHOS PATRIMONIALES Y PROPIEDAD INTELECTUAL
**Para cesión de código de software, marcas, diseños o derechos de autor**

**CONTRATO DE CESIÓN DE DERECHOS PATRIMONIALES Y DE PROPIEDAD INTELECTUAL QUE CELEBRAN, POR UNA PARTE, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL CEDENTE], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL CEDENTE", Y, POR LA OTRA, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL CESIONARIO], A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL CESIONARIO", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS.**

---

## DECLARACIONES

**I. Declara "EL CEDENTE":**
- Ser una [PERSONA FÍSICA/MORAL] con RFC [RFC DEL CEDENTE] y domicilio en [DOMICILIO COMPLETO DEL CEDENTE].
- Ser legítimo titular de los derechos patrimoniales sobre los activos intelectuales objeto del presente instrumento y contar con facultades plenas para cederlos libre de gravamen o limitación.

**II. Declara "EL CESIONARIO":**
- Ser una [PERSONA FÍSICA/MORAL] con RFC [RFC DEL CESIONARIO] y domicilio en [DOMICILIO COMPLETO DEL CESIONARIO].
- Tener interés y capacidad para adquirir los derechos patrimoniales descritos.

---

## CLÁUSULAS

**PRIMERA. OBJETO DE LA CESIÓN.**  
"EL CEDENTE" cede de manera definitiva y exclusiva a favor de "EL CESIONARIO" la totalidad de los derechos patrimoniales de explotación sobre los siguientes bienes intelectuales:
- **Código de software / Desarrollos:** [DESCRIPCIÓN DEL SOFTWARE, REPOSITORIO, VERSIÓN, LENGUAJE].
- **Marcas / Signos distintivos:** [DENOMINACIÓN, CLASE Y REGISTRO IMPI SI APLICA].
- **Diseños y Obras:** [DESCRIPCIÓN DE LA OBRA, FECHA DE CREACIÓN, REGISTRO INDAUTOR].

**SEGUNDA. PRECIO Y CONTRAPRESTACIÓN.**  
Como contraprestación por la cesión, "EL CESIONARIO" pagará a "EL CEDENTE" la cantidad de $[MONTO] ([MONTO EN LETRA] [MXN/USD]), mediante transferencia a la cuenta bancaria [CLABE] de [BANCO].

**TERCERA. DERECHOS MORALES.**  
Los derechos morales de autor continuarán perteneciendo al autor conforme a la Ley Federal del Derecho de Autor. "EL CEDENTE" se obliga a otorgar los reconocimientos necesarios para el goce pacífico de los derechos patrimoniales.

**CUARTA. SANEAMIENTO Y REGISTRO.**  
"EL CEDENTE" garantiza la autoría y titularidad de los derechos cedidos y se obliga al saneamiento para el caso de evicción. "EL CESIONARIO" podrá inscribir la presente cesión ante el INDAUTOR o el IMPI.

**QUINTA. JURISDICCIÓN.**  
Las Partes se someten a los tribunales de [CIUDAD/ESTADO], renunciando a cualquier fuero distinto.

Firmado en [LUGAR], el [DÍA] de [MES] de [AÑO].

---

**"EL CEDENTE"**  
________________________________________  
[NOMBRE Y FIRMA]

**"EL CESIONARIO"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'mercantil-reconocimiento-adeudo': `# CONVENIO DE RECONOCIMIENTO DE ADEUDO Y PLAN DE PAGOS
**Con calendario de parcialidades, intereses y sumisión a tribunales ejecutivos**

**CONVENIO DE RECONOCIMIENTO DE ADEUDO Y PLAN DE PAGOS QUE CELEBRAN, POR UNA PARTE, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL ACREEDOR], ("EL ACREEDOR"), Y, POR LA OTRA, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL DEUDOR], ("EL DEUDOR"), AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS.**

---

## DECLARACIONES

**I. Declara "EL ACREEDOR":**
- Ser titular del derecho de crédito derivado de [ORIGEN DE LA DEUDA, EJ. FACTURAS VENCIDAS, SUMINISTRO O CONTRATO PREVIO].

**II. Declara "EL DEUDOR":**
- Reconocer expresamente e incondicionalmente adeudar a "EL ACREEDOR" la cantidad líquida y exigible que se detalla en este instrumento.

---

## CLÁUSULAS

**PRIMERA. RECONOCIMIENTO DE ADEUDO.**  
"EL DEUDOR" reconoce deber a "EL ACREEDOR" la cantidad líquida total de $[MONTO TOTAL] ([MONTO EN LETRA] [MXN/USD]), por concepto de suerte principal.

**SEGUNDA. PLAN DE PAGOS.**  
"EL DEUDOR" se obliga a pagar la suma reconocida conforme al siguiente calendario de parcialidades:

| No. Parcialidad | Fecha Límite de Pago | Monto |
|---|---|---|
| 1 | [FECHA DD/MM/AAAA] | $[MONTO] |
| 2 | [FECHA DD/MM/AAAA] | $[MONTO] |
| 3 | [FECHA DD/MM/AAAA] | $[MONTO] |
| Finiquito | [FECHA DD/MM/AAAA] | $[MONTO RESTANTE] |

Los pagos se realizarán en la cuenta bancaria [CLABE] de [BANCO].

**TERCERA. INTERESES MORATORIOS.**  
En caso de retraso en el pago de cualquiera de las parcialidades, el saldo insoluto generará intereses moratorios al [PORCENTAJE]% mensual hasta su total liquidación.

**CUARTA. VENCIMIENTO ANTICIPADO.**  
La falta de pago oportuno de [1 o 2] parcialidades dará derecho a "EL ACREEDOR" a declarar vencido anticipadamente el plazo y exigir judicialmente la totalidad del adeudo en la vía ejecutiva mercantil.

**QUINTA. JURISDICCIÓN.**  
Para la ejecución y cobro judicial, las Partes se someten expresamente a los tribunales competentes de [CIUDAD/ESTADO].

Firmado en [LUGAR], el [DÍA] de [MES] de [AÑO].

---

**"EL ACREEDOR"**  
________________________________________  
[NOMBRE Y FIRMA]

**"EL DEUDOR"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'mercantil-adenda': `# CONVENIO MODIFICATORIO / ADENDA CONTRACTUAL

**CONVENIO MODIFICATORIO Y ADENDA AL CONTRATO DE [TIPO DE CONTRATO ORIGINAL] CELEBRADO EL [FECHA ORIGINAL], QUE CELEBRAN POR UNA PARTE [NOMBRE DE LA PARTE 1] ("LA PARTE 1"), Y POR LA OTRA [NOMBRE DE LA PARTE 2] ("LA PARTE 2"), AL TENOR DE LO SIGUIENTE:**

---

## DECLARACIONES

**I. Declaran las Partes:**
- Que con fecha [FECHA DEL CONTRATO ORIGINAL] celebraron un contrato de [TIPO DE CONTRATO], el cual se encuentra vigente.
- Que es su voluntad modificar de común acuerdo cláusulas específicas sin alterar el resto de las obligaciones pactadas.

---

## CLÁUSULAS

**PRIMERA. OBJETO Y MODIFICACIONES.**  
Las Partes acuerdan modificar las siguientes estipulaciones del contrato original:

- **Plazo / Vigencia:** Se modifica la cláusula [NÚMERO], prorrogando la fecha de vencimiento hasta el [NUEVA FECHA DD/MM/AAAA].
- **Monto / Contraprestación:** Se modifica la cláusula [NÚMERO], quedando el nuevo monto total en $[MONTO EN NÚMERO] ([MONTO EN LETRA]).
- **Entregables / Alcance:** Se ajustan los entregables para quedar como sigue: [DESCRIPCIÓN DE AJUSTES].

**SEGUNDA. SUBSISTENCIA Y RATIFICACIÓN.**  
Las Partes ratifican en todos sus términos las cláusulas del contrato original que no hayan sido expresamente modificadas por el presente instrumento, así como sus garantías y penas convencionales.

**TERCERA. JURISDICCIÓN.**  
Para la interpretación y cumplimiento de esta Adenda, las Partes ratifican la sumisión a los tribunales de [CIUDAD/ESTADO].

Firmado por duplicado en [LUGAR], a [DÍA] de [MES] de [AÑO].

---

**"LA PARTE 1"**  
________________________________________  
[NOMBRE Y FIRMA]

**"LA PARTE 2"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'mercantil-pagare': `# PAGARÉ MERCANTIL

**Lugar de Suscripción:** [CIUDAD/ESTADO]  
**Fecha de Suscripción:** [FECHA DD/MM/AAAA]  
**Bueno por:** $[MONTO EN NÚMERO] [MXN/USD]

Por este Pagaré, el suscrito me obligo incondicionalmente a pagar a la orden de **[NOMBRE DEL ACREEDOR]**, en el domicilio ubicado en [LUGAR DE PAGO], el día **[FECHA DE VENCIMIENTO DD/MM/AAAA]**, la cantidad de:

**$[MONTO EN NÚMERO] ([MONTO EN LETRA] PESOS 00/100 M.N. / USD)**

Valor recibido a mi entera satisfacción. La suma anterior causará intereses moratorios a razón del **[PORCENTAJE]%** mensual a partir de la fecha de su vencimiento y hasta su total y definitiva liquidación.

Para todo lo relativo a la interpretación, cumplimiento y ejecución del presente título de crédito, el suscriptor se somete expresamente a los tribunales competentes de [CIUDAD/ESTADO], renunciando a cualquier fuero que por razón de su domicilio presente o futuro pudiera corresponderle.

---

**SUSCRIPTOR / DEUDOR:**  
Nombre / Razón Social: [NOMBRE DEL DEUDOR]  
RFC: [RFC DEL DEUDOR]  
Domicilio: [DOMICILIO DEL DEUDOR]  
Firma: ________________________________________

**AVAL (si aplica):**  
Nombre: [NOMBRE DEL AVAL]  
RFC: [RFC DEL AVAL]  
Domicilio: [DOMICILIO DEL AVAL]  
Firma: ________________________________________
`,

  'comercio_exterior-compraventa-internacional': `# CONTRATO DE COMPRAVENTA INTERNACIONAL DE MERCANCÍAS

**CONTRATO DE COMPRAVENTA INTERNACIONAL DE MERCANCÍAS QUE CELEBRAN, POR UNA PARTE, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL EXPORTADOR/VENDEDOR], EN LO SUCESIVO "EL VENDEDOR", Y, POR LA OTRA, [NOMBRE COMPLETO O RAZÓN SOCIAL DEL IMPORTADOR/COMPRADOR], EN LO SUCESIVO "EL COMPRADOR", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:**

---

## DECLARACIONES

**I. Declara "EL VENDEDOR":**
- Ser una sociedad legalmente constituida conforme a las leyes de [PAÍS DEL VENDEDOR], con Tax ID [NÚMERO FISCAL] y domicilio en [DOMICILIO COMPLETO].
- Tener plena capacidad jurídica para exportar y suministrar las mercancías.

**II. Declara "EL COMPRADOR":**
- Ser una sociedad legalmente constituida conforme a las leyes de [PAÍS DEL COMPRADOR], con Tax ID/RFC [NÚMERO FISCAL] y domicilio en [DOMICILIO COMPLETO].
- Tener interés en adquirir e importar las mercancías pactadas.

**III. Declaran ambas Partes:**
- Sujetarse a las disposiciones de la Convención de las Naciones Unidas sobre los Contratos de Compraventa Internacional de Mercaderías (CISG) y a las reglas Incoterms® 2020 de la CCI.

---

## CLÁUSULAS

**PRIMERA. OBJETO.**  
"EL VENDEDOR" venderá y entregará a "EL COMPRADOR", quien pagará y recibirá:
- **Mercancía:** [DESCRIPCIÓN TÉCNICA DETALLADA].
- **Fracción Arancelaria (HS Code):** [FRACCIÓN ARANCELARIA].
- **Cantidad:** [CANTIDAD Y UNIDADES].
- **País de Origen:** [PAÍS DE ORIGEN].

**SEGUNDA. PRECIO E INCOTERM.**  
El precio total de la operación es de $[MONTO] [USD/EUR/MXN] ([MONTO EN LETRA]), bajo la regla **Incoterms® 2020: [INCOTERM, EJ. FOB, CIF, DAP, FCA]** en el punto de entrega [PUERTO O LUGAR CONVENIDO].

**TERCERA. FORMA DE PAGO.**  
El pago se realizará mediante [CARTA DE CRÉDITO CONFIRMADA / TRANSFERENCIA INTERNACIONAL SWIFT] dentro del plazo de [PLAZO DE PAGO] a la cuenta bancaria [IBAN/SWIFT] de [BANCO].

**CUARTA. DOCUMENTOS ADUANEROS Y DE EMBARQUE.**  
"EL VENDEDOR" proveerá: Factura Comercial, Packing List, Conocimiento de Embarque (B/L o AWB), Certificado de Origen y Certificados de Calidad requeridos para el despacho aduanero.

**QUINTA. INSPECCIÓN Y GARANTÍAS.**  
"EL COMPRADOR" tendrá derecho a inspeccionar las mercancías en [DESTINO / ORIGEN]. Los reclamos por faltantes o inconformidad deberán notificarse dentro de los [NÚMERO] días posteriores a la recepción.

**SEXTA. SOLUCIÓN DE CONTROVERSIAS Y ARBITRAJE.**  
Toda disputa se resolverá mediante arbitraje comercial conforme al reglamento de la [CÁMARA DE COMERCIO INTERNACIONAL (CCI) / CAM], en idioma español, en [CIUDAD/PAÍS].

Firmado en dos ejemplares en [LUGAR], a [FECHA].

---

**"EL VENDEDOR"**  
________________________________________  
[NOMBRE Y CARGO]

**"EL COMPRADOR"**  
________________________________________  
[NOMBRE Y CARGO]
`,

  'comercio_exterior-aviso-privacidad': `# AVISO DE PRIVACIDAD PARA OPERACIONES DE COMERCIO EXTERIOR Y ADUANAS

**Responsable del tratamiento:** [NOMBRE COMPLETO O RAZÓN SOCIAL DEL RESPONSABLE], con domicilio en [DOMICILIO COMPLETO] y correo electrónico [CORREO ELECTRÓNICO].  
En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), se informa lo siguiente:

---

**1. Datos personales que se recaban.**  
Para llevar a cabo las operaciones de comercio exterior, importación, exportación, despacho aduanero, logística, transporte y facturación, podremos recabar:
- **Identificación:** Nombre, denominación social, RFC, CURP, domicilio, teléfono y correo electrónico.
- **Patrimoniales y financieros:** Cuentas bancarias, referencias comerciales y fiscales.
- **Aduaneros:** Datos en pedimentos, facturas comerciales, certificados de origen y documentos de transporte.

**2. Finalidades del tratamiento.**  
- **Primarias:** Tramitar el despacho aduanero, elaborar pedimentos y cartas encomienda, cumplir obligaciones ante SAT y ANAM, gestionar regulaciones no arancelarias y prestar servicios logísticos.
- **Secundarias:** Control interno de calidad y avisos normativos.

**3. Transferencia de datos.**  
Sus datos podrán transferirse a autoridades aduaneras y fiscales (SAT, ANAM), agentes aduanales, transportistas y aseguradoras, conforme al artículo 37 de la LFPDPPP.

**4. Derechos ARCO.**  
Usted podrá ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición enviando su solicitud al correo [CORREO DERECHOS ARCO].

---

**Firma del Representante Legal:**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'comercio_exterior-poder-especial-aduanero': `# PODER ESPECIAL PARA ACTOS DE COMERCIO EXTERIOR Y ADUANEROS

**PODER ESPECIAL QUE OTORGA [NOMBRE COMPLETO O RAZÓN SOCIAL DEL PODERDANTE] ("EL PODERDANTE"), A FAVOR DE [NOMBRE DEL APODERADO] ("EL APODERADO"), PARA ACTOS DE COMERCIO EXTERIOR Y DESPACHO ADUANERO.**

---

En [CIUDAD], a [DÍA] de [MES] de [AÑO].

**PRIMERA. OTORGAMIENTO.**  
"EL PODERDANTE" otorga a favor de "EL APODERADO" **Poder Especial** para que en su nombre y representación realice todos los actos y trámites relacionados con operaciones de comercio exterior y aduanas ante el Servicio de Administración Tributaria (SAT), la Agencia Nacional de Aduanas de México (ANAM) y demás dependencias competentes.

**SEGUNDA. FACULTADES CONFERIDAS.**  
"EL APODERADO" queda facultado para:
1. Realizar trámites de despacho aduanero de importación y exportación de mercancías.
2. Suscribir y firmar pedimentos, declaraciones, manifestaciones de valor y cartas de instrucciones.
3. Designar, encomendar y contratar agentes aduanales autorizados.
4. Gestionar permisos, avisos y certificados ante la Secretaría de Economía y dependencias correspondientes.
5. Efectuar pagos de impuestos al comercio exterior, cuotas compensatorias y derechos aduanales.

**TERCERA. LIMITACIONES.**  
El presente poder no faculta para enajenar o gravar bienes inmuebles ni otorgar garantías o avales a cargo del poderdante.

---

**"EL PODERDANTE"**  
________________________________________  
[NOMBRE Y FIRMA]

**"EL APODERADO"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'aduanal-prestacion-servicios-agente-aduanal': `# CONTRATO DE PRESTACIÓN DE SERVICIOS DE AGENTE ADUANAL Y CARTA ENCOMIENDA

**CONTRATO DE PRESTACIÓN DE SERVICIOS ADUANALES QUE CELEBRAN [NOMBRE DEL AGENTE ADUANAL / AGENCIA ADUANAL], CON PATENTE ADUANAL NO. [NÚMERO DE PATENTE] ("EL AGENTE ADUANAL"), Y [NOMBRE O RAZÓN SOCIAL DEL CLIENTE] ("EL CLIENTE"), AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:**

---

## DECLARACIONES

**I. Declara "EL AGENTE ADUANAL":**
- Contar con patente aduanal no. [NÚMERO DE PATENTE] autorizada por el SAT en términos del artículo 159 de la Ley Aduanera, con adscripción en la aduana de [ADUANA DE ADSCRIPCIÓN].

**II. Declara "EL CLIENTE":**
- Ser persona [FÍSICA/MORAL] con RFC [RFC DEL CLIENTE] y tener interés en encomendar sus operaciones de despacho aduanero.

---

## CLÁUSULAS

**PRIMERA. OBJETO Y SERVICIOS.**  
"EL AGENTE ADUANAL" se obliga a prestar los servicios de despacho aduanero, clasificación arancelaria, elaboración de pedimentos y representación aduanera para las operaciones de importación/exportación encomendadas por "EL CLIENTE".

**SEGUNDA. OBLIGACIONES DEL CLIENTE.**  
"EL CLIENTE" se obliga a suministrar oportunamente la documentación verídica (facturas, certificados de origen, guías, permisos) y a proveer los fondos necesarios para el pago de contribuciones y gastos aduanales.

**TERCERA. HONORARIOS Y GASTOS.**  
"EL CLIENTE" pagará a "EL AGENTE ADUANAL" los honorarios pactados de $[MONTO/TARIFA], más gastos de maniobras y comprobantes deducibles.

**CUARTA. JURISDICCIÓN.**  
Las Partes se someten a los tribunales de [CIUDAD/ESTADO].

Firmado en [LUGAR], a [FECHA].

---

**"EL AGENTE ADUANAL"**  
________________________________________  
Patente No. [NÚMERO]

**"EL CLIENTE"**  
________________________________________  
RFC: [RFC]
`,

  'aduanal-poder-especial-aduanas': `# PODER ESPECIAL PARA DESPACHO ADUANAL

**PODER ESPECIAL QUE OTORGA [NOMBRE O RAZÓN SOCIAL DEL PODERDANTE] ("EL PODERDANTE"), A FAVOR DE [NOMBRE DEL APODERADO] ("EL APODERADO"), PARA REPRESENTACIÓN ANTE LA AUTORIDAD ADUANAL.**

---

En [CIUDAD], a [DÍA] de [MES] de [AÑO].

**CLÁUSULA ÚNICA. FACULTADES.**  
"EL PODERDANTE" confiere poder especial a "EL APODERADO" para que ante la Agencia Nacional de Aduanas de México (ANAM), el SAT y las distintas aduanas del país:
- Gestione despachos aduaneros y firme pedimentos de importación/exportación.
- Presente manifestaciones de valor, solicitudes de rectificación y promociones aduanales.
- Atienda requerimientos, actas de verificación y notificaciones oficiales.

---

**"EL PODERDANTE"**  
________________________________________  
[NOMBRE Y FIRMA]

**"EL APODERADO"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'aduanal-aviso-privacidad': `# AVISO DE PRIVACIDAD ADUANAL

**Responsable:** [NOMBRE O RAZÓN SOCIAL DE LA AGENCIA ADUANAL], con domicilio en [DOMICILIO FISCAL] y correo [CORREO ELECTRÓNICO].

En cumplimiento con la LFPDPPP y la Ley Aduanera, sus datos personales, fiscales y aduaneros recabados con motivo del despacho aduanero y trámites ante SAT/ANAM serán tratados con estricta confidencialidad y bajo medidas de seguridad física y técnica. Para ejercer sus Derechos ARCO, contacte a [CORREO DERECHOS ARCO].

---
[NOMBRE Y FIRMA DEL REPRESENTANTE LEGAL]
`,

  'laboral-confidencialidad-no-competencia': `# CONVENIO DE CONFIDENCIALIDAD Y NO COMPETENCIA LABORAL
**Anexo al Contrato Individual de Trabajo**

**CONVENIO QUE CELEBRAN [NOMBRE DE LA EMPRESA] ("LA EMPRESA"), Y [NOMBRE DEL EMPLEADO] ("EL EMPLEADO"), AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:**

---

## DECLARACIONES

**I. Declaran las Partes:**
- Que el presente instrumento es accesorio al contrato individual de trabajo celebrado con fecha [FECHA CONTRATO LABORAL].
- Que "EL EMPLEADO" tiene acceso a secretos industriales, técnicos y cartera de clientes de "LA EMPRESA".

---

## CLÁUSULAS

**PRIMERA. INFORMACIÓN CONFIDENCIAL.**  
Comprende secretos técnicos, código fuente, planes comerciales, listas de clientes y datos financieros no públicos.

**SEGUNDA. OBLIGACIÓN DE NO DIVULGACIÓN.**  
"EL EMPLEADO" se obliga a no divulgar, copiar ni utilizar en provecho propio o de terceros la información confidencial durante la relación laboral y por [NÚMERO] años posteriores a su terminación.

**TERCERA. NO COMPETENCIA POSTERIOR.**  
"EL EMPLEADO" se obliga a no prestar servicios a competidores directos en el territorio de [TERRITORIO] por un plazo de [NÚMERO] meses posteriores a la terminación, recibiendo como compensación la suma de $[MONTO] mensual.

**CUARTA. PENA CONVENCIONAL.**  
El incumplimiento generará una pena convencional de $[MONTO], sin perjuicio de las acciones legales procedentes.

Firmado en [LUGAR], a [FECHA].

---

**"LA EMPRESA"**  
________________________________________  
[REPRESENTANTE LEGAL]

**"EL EMPLEADO"**  
________________________________________  
[NOMBRE Y FIRMA]
`,

  'fiscal-escrito-aclaracion': `# ESCRITO LIBRE DE ACLARACIÓN AL SAT

**Asunto:** Contestación a requerimiento / Aclaración legal  
**Autoridad a la que se dirige:** [AUTORIDAD FISCAL, EJ. ADMINISTRACIÓN DESCONCENTRADA DE AUDITORÍA FISCAL]  
**Folio / Requerimiento:** [NÚMERO DE FOLIO O REQUERIMIENTO]

El que suscribe, **[NOMBRE O RAZÓN SOCIAL DEL CONTRIBUYENTE]**, con Registro Federal de Contribuyentes **[RFC]**, señalando como domicilio fiscal para oír y recibir notificaciones el ubicado en [DOMICILIO FISCAL COMPLETO], comparezco respetuosamente para exponer:

Que por medio del presente escrito, y con fundamento en los artículos 18 y 18-A del Código Fiscal de la Federación, vengo a dar contestación y presentar aclaración en relación al requerimiento con folio **[NÚMERO DE FOLIO]**.

---

## HECHOS Y ACLARACIONES

1. Con fecha [FECHA DE NOTIFICACIÓN], se notificó al suscrito el requerimiento citado al rubro.
2. Al respecto, se aclara que [DESCRIPCIÓN CIRCUNSTANCIADA DE LOS HECHOS, OPERACIONES, COMPROBANTES Y ACLARACIONES JURÍDICAS].
3. Se adjuntan como prueba los siguientes documentos: [RELACIÓN DE COMPROBANTES, CFDI, ESTADOS DE CUENTA, CONTRATOS].

---

## PUNTOS PETITORIOS

**ÚNICO.** Tenerme por presentado en tiempo y forma el presente escrito, teniendo por solventadas las observaciones o requerimientos formulados.

Protesto lo necesario.

[LUGAR Y FECHA]

________________________________________  
**[NOMBRE DEL CONTRIBUYENTE O REPRESENTANTE LEGAL]**  
RFC: [RFC]
`,
};

export function getFullTemplateBody(template: DraftingTemplate): string {
  if (TEMPLATE_FULL_BODIES[template.id]) {
    return TEMPLATE_FULL_BODIES[template.id];
  }

  // Generar un machote formal completo y limpio a partir de los metadatos de la plantilla
  const requiredList = template.requiredFields.map((f) => `- **${f}:** [${f.toUpperCase()}]`).join('\n');

  return `# ${template.title.toUpperCase()}

**${template.description}**

---

## DECLARACIONES Y ELEMENTOS ESENCIALES

${requiredList}

---

## TÉRMINOS Y CONDICIONES

**PRIMERA. OBJETO.**  
${template.prompt}

**SEGUNDA. ENTREGABLES Y CUMPLIMIENTO.**  
${template.output}

**TERCERA. DATOS Y DECLARACIONES DE LAS PARTES.**  
Las Partes manifiestan que los datos, domicilios, identificaciones y facultades asentadas en el presente instrumento son verídicos y vigentes.

**CUARTA. CONFIDENCIALIDAD Y TÉRMINOS OPERATIVOS.**  
Las Partes se obligan a guardar confidencialidad respecto de los términos y condiciones del presente instrumento.

**QUINTA. JURISDICCIÓN Y LEY APLICABLE.**  
Para la interpretación y cumplimiento de este instrumento, las Partes se someten a los tribunales competentes de [CIUDAD / ESTADO], renunciando a cualquier fuero distinto.

---

Leído y ratificado el presente documento, se firma en [LUGAR], a los [DÍA] días del mes de [MES] del año [AÑO].

________________________________________  
**[PARTE 1 / REPRESENTANTE LEGAL]**  
[RFC / IDENTIFICACIÓN]

________________________________________  
**[PARTE 2 / REPRESENTANTE LEGAL]**  
[RFC / IDENTIFICACIÓN]
`;
}
