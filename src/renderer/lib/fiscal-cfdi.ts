import type { FiscalCfdiRecord } from '../types';

const readAttribute = (tag: string, name: string) => {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match?.[1]?.trim() || undefined;
};

const readTag = (xml: string, localName: string) => {
  const match = xml.match(new RegExp(`<(?:(?:[\\w-]+):)?${localName}\\b[^>]*>`, 'i'));
  return match?.[0] || '';
};

export function parseCfdiXml(xml: string, fileName: string): FiscalCfdiRecord {
  const comprobante = readTag(xml, 'Comprobante');
  const emisor = readTag(xml, 'Emisor');
  const receptor = readTag(xml, 'Receptor');
  const timbre = readTag(xml, 'TimbreFiscalDigital');

  return {
    fileName,
    uuid: readAttribute(timbre, 'UUID'),
    version: readAttribute(comprobante, 'Version') || readAttribute(comprobante, 'version'),
    issuerRfc: readAttribute(emisor, 'Rfc') || readAttribute(emisor, 'rfc'),
    receiverRfc: readAttribute(receptor, 'Rfc') || readAttribute(receptor, 'rfc'),
    total: readAttribute(comprobante, 'Total') || readAttribute(comprobante, 'total'),
    currency: readAttribute(comprobante, 'Moneda') || readAttribute(comprobante, 'moneda'),
    issuedAt: readAttribute(comprobante, 'Fecha') || readAttribute(comprobante, 'fecha'),
  };
}

export async function readCfdiFiles(files: File[]): Promise<FiscalCfdiRecord[]> {
  const xmlFiles = files.filter((file) => file.name.toLowerCase().endsWith('.xml'));
  return Promise.all(xmlFiles.map(async (file) => parseCfdiXml(await file.text(), file.name)));
}

export function formatCfdiContext(records: FiscalCfdiRecord[]): string {
  if (!records.length) return '';
  return records.map((record) => [
    `Archivo: ${record.fileName}`,
    record.uuid ? `UUID: ${record.uuid}` : 'UUID: no identificado',
    record.issuerRfc ? `RFC emisor: ${record.issuerRfc}` : 'RFC emisor: no identificado',
    record.receiverRfc ? `RFC receptor: ${record.receiverRfc}` : 'RFC receptor: no identificado',
    record.total ? `Total: ${record.total}${record.currency ? ` ${record.currency}` : ''}` : 'Total: no identificado',
    record.issuedAt ? `Fecha: ${record.issuedAt}` : '',
  ].filter(Boolean).join(' · ')).join('\n');
}
