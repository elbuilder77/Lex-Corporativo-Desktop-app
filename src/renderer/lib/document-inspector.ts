import { DocumentClassifier, type OperationDocument } from '../../main/lib/core-legal/business-core';

export interface DocumentInspectionSummary {
  fileName: string;
  fileSizeFormatted: string;
  format: 'pdf' | 'docx' | 'xml' | 'cfdi' | 'text' | 'markdown';
  formatLabel: string;
  formatColor: string;
  category: OperationDocument['category'];
  categoryLabel: string;
  detectedInsights: { label: string; value: string }[];
  previewSnippet?: string;
}

const CATEGORY_LABELS: Record<OperationDocument['category'], string> = {
  contract: 'Instrumento Contractual / Convenio',
  cfdi: 'Comprobante Fiscal Digital (CFDI)',
  payment_proof: 'Comprobante de Pago / Transferencia',
  deliverable: 'Entregable / Dictamen de Servicio',
  evidence: 'Soporte Probatorio / Bitácora',
  communication: 'Comunicación / Notificación',
  purchase_order: 'Orden de Compra / Pedido',
  service_report: 'Informe de Servicios Prestados',
  other: 'Documento Legal General',
};

export async function inspectDocumentFile(
  file: File,
  ecosystemArea?: string
): Promise<DocumentInspectionSummary> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const sizeMb = file.size / (1024 * 1024);
  const fileSizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(2)} MB` : `${(file.size / 1024).toFixed(1)} KB`;

  let format: DocumentInspectionSummary['format'] = 'text';
  let formatLabel = 'Texto Plano';
  let formatColor = 'slate';

  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    format = 'pdf';
    formatLabel = 'Documento PDF';
    formatColor = 'rose';
  } else if (
    file.type.includes('wordprocessingml') ||
    file.type.includes('msword') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc')
  ) {
    format = 'docx';
    formatLabel = 'Microsoft Word (.docx)';
    formatColor = 'blue';
  } else if (file.type.includes('xml') || lowerName.endsWith('.xml')) {
    format = 'xml';
    formatLabel = 'Archivo XML';
    formatColor = 'amber';
  } else if (lowerName.endsWith('.md') || file.type === 'text/markdown') {
    format = 'markdown';
    formatLabel = 'Markdown Legal';
    formatColor = 'indigo';
  }

  const category = DocumentClassifier.classify(fileName, file.type);
  let categoryLabel = CATEGORY_LABELS[category] || 'Documento Legal General';

  const detectedInsights: { label: string; value: string }[] = [];
  let previewSnippet: string | undefined;

  // If XML / CFDI or Plain Text / Markdown: read initial text snippet for instantaneous insights
  if (format === 'xml' || format === 'text' || format === 'markdown') {
    try {
      const slice = file.slice(0, 15_000);
      const text = await slice.text();
      previewSnippet = text.slice(0, 300).trim();

      if (format === 'xml' && (text.includes('<cfdi:Comprobante') || text.includes('<Comprobante'))) {
        format = 'cfdi';
        formatLabel = 'Factura Fiscal SAT (CFDI 4.0)';
        formatColor = 'emerald';
        categoryLabel = 'Comprobante Fiscal Digital (CFDI)';

        const getAttr = (attr: string) => {
          const match = text.match(new RegExp(`(?:^|\\s)${attr}="([^"]*)"`, 'i'));
          return match ? match[1] : '';
        };

        const uuidMatch = text.match(/UUID="([^"]*)"/i);
        const total = getAttr('Total');
        const emisor = getAttr('Rfc');
        const moneda = getAttr('Moneda') || 'MXN';

        if (uuidMatch) detectedInsights.push({ label: 'Folio UUID', value: `${uuidMatch[1].slice(0, 13)}...` });
        if (emisor) detectedInsights.push({ label: 'RFC Emisor', value: emisor });
        if (total) detectedInsights.push({ label: 'Total', value: `$${total} ${moneda}` });
      } else {
        // Check for legal keywords in text
        if (/\b(?:DECLARACIONES|ANTECEDENTES)\b/i.test(text)) {
          detectedInsights.push({ label: 'Estructura', value: 'Declaraciones identificadas' });
        }
        if (/\b(?:CL[AÁ]USULAS?|PRIMERA|SEGUNDA)\b/i.test(text)) {
          detectedInsights.push({ label: 'Clausulado', value: 'Cláusulas contractuales' });
        }
        if (/\b(?:PAGAR[EÉ]|DEBO Y PAGAR[EÉ])\b/i.test(text)) {
          detectedInsights.push({ label: 'Título de Crédito', value: 'Pagaré / Obligación cambiaria' });
        }
        if (/\b(?:PEDIMENTO|AGENTE ADUANAL|IMPORTACI[OÓ]N)\b/i.test(text)) {
          detectedInsights.push({ label: 'Operación', value: 'Despacho aduanal / Comercio' });
        }
      }
    } catch {
      // Best-effort preview
    }
  } else if (format === 'docx') {
    detectedInsights.push({ label: 'Tipo', value: 'Procesador de texto Word editable' });
  } else if (format === 'pdf') {
    detectedInsights.push({ label: 'Motor', value: 'Worker PDF con extracción OCR' });
  }

  // Fallback insight based on ecosystem
  if (detectedInsights.length === 0) {
    detectedInsights.push({
      label: 'Materia',
      value: ecosystemArea ? ecosystemArea.toUpperCase() : 'AUDITORÍA JURÍDICA',
    });
  }

  return {
    fileName,
    fileSizeFormatted,
    format,
    formatLabel,
    formatColor,
    category,
    categoryLabel,
    detectedInsights,
    previewSnippet,
  };
}
