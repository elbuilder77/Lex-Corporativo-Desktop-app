import { createHash } from 'crypto';
import mammoth from 'mammoth';
import { extractTextContentAsync, type ExtractedPdfDocument, type ExtractedPdfPage } from './pdf-parser';

export type SupportedDocumentFormat = 'pdf' | 'docx' | 'xml' | 'cfdi' | 'text' | 'markdown';

export interface ExtractedDocumentPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocument {
  fileName: string;
  mimeType: string;
  format: SupportedDocumentFormat;
  text: string;
  pages: ExtractedDocumentPage[];
  pageCount: number;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/xml',
  'text/xml',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.doc',
  '.xml',
  '.txt',
  '.md',
  '.markdown',
] as const;

export function sha256Content(content: string | Buffer | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}

export function detectDocumentFormat(fileName: string, mimeType?: string): SupportedDocumentFormat {
  const lowerName = fileName.toLowerCase();
  const lowerMime = (mimeType || '').toLowerCase();

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (
    lowerMime.includes('wordprocessingml') ||
    lowerMime.includes('msword') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    return 'docx';
  }
  if (lowerMime.includes('xml') || lowerName.endsWith('.xml')) {
    return 'xml';
  }
  if (lowerMime === 'text/markdown' || lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
    return 'markdown';
  }
  return 'text';
}

export function isAllowedDocumentFile(file: { name: string; mimeType?: string }): boolean {
  const lowerName = file.name.toLowerCase();
  const lowerMime = (file.mimeType || '').toLowerCase();

  if (ALLOWED_DOCUMENT_MIME_TYPES.some((m) => lowerMime === m)) return true;
  if (ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) return true;
  return false;
}

/**
 * Parses generic XML or Mexican SAT CFDI 3.3/4.0 documents into clean structured legal evidence text.
 */
export function parseXmlOrCfdi(xmlContent: string, fileName: string): {
  format: 'cfdi' | 'xml';
  text: string;
  metadata?: Record<string, unknown>;
} {
  const isCfdi = /<cfdi:Comprobante|<Comprobante/i.test(xmlContent);

  if (!isCfdi) {
    // Generic XML cleanup
    const cleanText = xmlContent
      .replace(/<!--[\s\S]*?-->/g, '') // remove comments
      .replace(/<[^>]+>/g, ' ') // strip tags preserving space
      .replace(/\s{2,}/g, ' ')
      .trim();

    return {
      format: 'xml',
      text: `[DOCUMENTO XML: ${fileName}]\n\n${cleanText || xmlContent.slice(0, 10_000)}`,
    };
  }

  const getAttrDirect = (block: string, attr: string): string => {
    const attrMatch = block.match(new RegExp(`(?:^|\\s)${attr}="([^"]*)"`, 'i'));
    return attrMatch ? attrMatch[1] : '';
  };


  const compMatch = xmlContent.match(/<(?:cfdi:)?Comprobante\b[^>]*>/i);
  const compHeader = compMatch ? compMatch[0] : '';

  const version = getAttrDirect(compHeader, 'Version');
  const fecha = getAttrDirect(compHeader, 'Fecha');
  const folio = getAttrDirect(compHeader, 'Folio');
  const serie = getAttrDirect(compHeader, 'Serie');
  const tipoDeComprobante = getAttrDirect(compHeader, 'TipoDeComprobante');
  const formaPago = getAttrDirect(compHeader, 'FormaPago');
  const metodoPago = getAttrDirect(compHeader, 'MetodoPago');
  const moneda = getAttrDirect(compHeader, 'Moneda') || 'MXN';
  const subTotal = getAttrDirect(compHeader, 'SubTotal');
  const total = getAttrDirect(compHeader, 'Total');
  const lugarExpedicion = getAttrDirect(compHeader, 'LugarExpedicion');

  // Emisor
  const emisorMatch = xmlContent.match(/<(?:cfdi:)?Emisor\b[^>]*>/i);
  const emisorBlock = emisorMatch ? emisorMatch[0] : '';
  const emisorRfc = getAttrDirect(emisorBlock, 'Rfc');
  const emisorNombre = getAttrDirect(emisorBlock, 'Nombre');
  const emisorRegimen = getAttrDirect(emisorBlock, 'RegimenFiscal');

  // Receptor
  const receptorMatch = xmlContent.match(/<(?:cfdi:)?Receptor\b[^>]*>/i);
  const receptorBlock = receptorMatch ? receptorMatch[0] : '';
  const receptorRfc = getAttrDirect(receptorBlock, 'Rfc');
  const receptorNombre = getAttrDirect(receptorBlock, 'Nombre');
  const receptorUsoCfdi = getAttrDirect(receptorBlock, 'UsoCFDI');
  const receptorRegimen = getAttrDirect(receptorBlock, 'RegimenFiscalReceptor');
  const receptorCp = getAttrDirect(receptorBlock, 'DomicilioFiscalReceptor');

  // TimbreFiscalDigital
  const timbreMatch = xmlContent.match(/<(?:tfd:)?TimbreFiscalDigital\b[^>]*>/i);
  const timbreBlock = timbreMatch ? timbreMatch[0] : '';
  const uuid = getAttrDirect(timbreBlock, 'UUID');
  const fechaTimbrado = getAttrDirect(timbreBlock, 'FechaTimbrado');
  const rfcProvCertif = getAttrDirect(timbreBlock, 'RfcProvCertif');

  // Conceptos
  const conceptos: Array<{
    claveProdServ: string;
    cantidad: string;
    unidad: string;
    descripcion: string;
    valorUnitario: string;
    importe: string;
    objetoImp?: string;
  }> = [];

  const conceptoRegex = /<(?:cfdi:)?Concepto\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:cfdi:)?Concepto>)/gi;
  let match: RegExpExecArray | null;
  while ((match = conceptoRegex.exec(xmlContent)) !== null) {
    const headerAttrs = match[1] || '';
    conceptos.push({
      claveProdServ: getAttrDirect(headerAttrs, 'ClaveProdServ'),
      cantidad: getAttrDirect(headerAttrs, 'Cantidad'),
      unidad: getAttrDirect(headerAttrs, 'ClaveUnidad') || getAttrDirect(headerAttrs, 'Unidad'),
      descripcion: getAttrDirect(headerAttrs, 'Descripcion'),
      valorUnitario: getAttrDirect(headerAttrs, 'ValorUnitario'),
      importe: getAttrDirect(headerAttrs, 'Importe'),
      objetoImp: getAttrDirect(headerAttrs, 'ObjetoImp'),
    });
  }

  // Build Structured Legal Markdown Output
  const lines: string[] = [
    `# COMPROBANTE FISCAL DIGITAL POR INTERNET (CFDI v${version || '4.0'})`,
    `**Archivo:** ${fileName}`,
    uuid ? `**UUID (Folio Fiscal):** ${uuid}` : '',
    fecha ? `**Fecha de Emisión:** ${fecha}` : '',
    fechaTimbrado ? `**Fecha de Timbrado:** ${fechaTimbrado}` : '',
    rfcProvCertif ? `**PAC Certificador:** ${rfcProvCertif}` : '',
    `**Tipo de Comprobante:** ${tipoDeComprobante || 'I (Ingreso)'} | **Moneda:** ${moneda}`,
    folio || serie ? `**Serie/Folio:** ${[serie, folio].filter(Boolean).join('-')}` : '',
    formaPago ? `**Forma de Pago:** ${formaPago}` : '',
    metodoPago ? `**Método de Pago:** ${metodoPago}` : '',
    lugarExpedicion ? `**Lugar de Expedición (C.P.):** ${lugarExpedicion}` : '',
    `**Subtotal:** $${subTotal || '0.00'} | **Total:** $${total || '0.00'} ${moneda}`,
    '',
    '## 1. DATOS FISCALES DE LAS PARTES',
    `* **EMISOR (Proveedor/Prestador):** ${emisorNombre || '[Nombre no especificado]'}`,
    `  * **RFC:** ${emisorRfc || '[RFC ausente]'}`,
    emisorRegimen ? `  * **Régimen Fiscal:** ${emisorRegimen}` : '',
    `* **RECEPTOR (Cliente/Prestatario):** ${receptorNombre || '[Nombre no especificado]'}`,
    `  * **RFC:** ${receptorRfc || '[RFC ausente]'}`,
    receptorUsoCfdi ? `  * **Uso del CFDI:** ${receptorUsoCfdi}` : '',
    receptorRegimen ? `  * **Régimen Fiscal Receptor:** ${receptorRegimen}` : '',
    receptorCp ? `  * **Domicilio Fiscal Receptor (C.P.):** ${receptorCp}` : '',
    '',
    '## 2. CONCEPTOS Y DESCRIPCIÓN DE OPERACIONES FACTURADAS',
  ];

  if (conceptos.length > 0) {
    conceptos.forEach((c, idx) => {
      lines.push(
        `### Concepto ${idx + 1}: ${c.descripcion}`,
        `* **Clave Prod/Serv SAT:** ${c.claveProdServ || 'N/A'}`,
        `* **Cantidad:** ${c.cantidad} ${c.unidad || ''}`,
        `* **Precio Unitario:** $${c.valorUnitario} | **Importe:** $${c.importe}`,
        c.objetoImp ? `* **Objeto de Impuesto:** ${c.objetoImp}` : ''
      );
    });
  } else {
    lines.push('_No se encontraron líneas de conceptos detalladas en el CFDI._');
  }

  const structuredText = lines.filter(Boolean).join('\n');

  return {
    format: 'cfdi',
    text: structuredText,
    metadata: {
      uuid,
      version,
      fecha,
      emisorRfc,
      emisorNombre,
      receptorRfc,
      receptorNombre,
      subTotal,
      total,
      moneda,
      conceptosCount: conceptos.length,
    },
  };
}

/**
 * Extracts plain text from DOCX documents using mammoth with clean paragraph structure.
 */
export async function parseDocx(buffer: Buffer, fileName: string): Promise<string> {
  if (buffer.length === 0) {
    throw new Error(`El archivo Word '${fileName}' está vacío.`);
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!text) {
      throw new Error(`No se pudo extraer texto seleccionable de '${fileName}'.`);
    }

    return text;
  } catch (err: any) {
    throw new Error(`Error al leer el archivo Word '${fileName}': ${err.message || err}`);
  }
}

/**
 * Unified Document Extractor: Handles PDF, DOCX, XML, CFDI, Markdown, and TXT seamlessly.
 */
export async function extractDocumentContent(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ExtractedDocument> {
  if (!buffer || buffer.length === 0) {
    throw new Error(`El archivo '${fileName}' está vacío.`);
  }

  const format = detectDocumentFormat(fileName, mimeType);
  const resolvedMime = mimeType || (
    format === 'pdf' ? 'application/pdf' :
    format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
    format === 'xml' || format === 'cfdi' ? 'application/xml' :
    format === 'markdown' ? 'text/markdown' : 'text/plain'
  );

  if (format === 'pdf') {
    const extractedPdf: ExtractedPdfDocument = await extractTextContentAsync(buffer, fileName);
    return {
      fileName,
      mimeType: resolvedMime,
      format: 'pdf',
      text: extractedPdf.text,
      pages: extractedPdf.pages,
      pageCount: extractedPdf.pageCount,
      contentHash: extractedPdf.contentHash,
    };
  }

  if (format === 'docx') {
    const docxText = await parseDocx(buffer, fileName);
    const contentHash = sha256Content(docxText);
    return {
      fileName,
      mimeType: resolvedMime,
      format: 'docx',
      text: docxText,
      pages: [{ pageNumber: 1, text: docxText }],
      pageCount: 1,
      contentHash,
    };
  }

  if (format === 'xml') {
    const rawXml = buffer.toString('utf8');
    const parsed = parseXmlOrCfdi(rawXml, fileName);
    const contentHash = sha256Content(parsed.text);
    return {
      fileName,
      mimeType: resolvedMime,
      format: parsed.format,
      text: parsed.text,
      pages: [{ pageNumber: 1, text: parsed.text }],
      pageCount: 1,
      contentHash,
      metadata: parsed.metadata,
    };
  }

  // TXT or Markdown
  const textContent = buffer
    .toString('utf8')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();

  if (!textContent) {
    throw new Error(`El archivo '${fileName}' no contiene texto legible.`);
  }

  const contentHash = sha256Content(textContent);
  return {
    fileName,
    mimeType: resolvedMime,
    format: format === 'markdown' ? 'markdown' : 'text',
    text: textContent,
    pages: [{ pageNumber: 1, text: textContent }],
    pageCount: 1,
    contentHash,
  };
}
