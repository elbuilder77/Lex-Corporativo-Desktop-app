import { describe, expect, it } from 'vitest';
import {
  detectDocumentFormat,
  extractDocumentContent,
  isAllowedDocumentFile,
  parseXmlOrCfdi,
  sha256Content,
} from '../src/main/lib/document-parser';

describe('document-parser multiformato', () => {
  it('detecta formatos de documentos correctamente por extensión y mimeType', () => {
    expect(detectDocumentFormat('contrato.pdf')).toBe('pdf');
    expect(detectDocumentFormat('acta.docx')).toBe('docx');
    expect(detectDocumentFormat('factura.xml')).toBe('xml');
    expect(detectDocumentFormat('notas.md')).toBe('markdown');
    expect(detectDocumentFormat('declaracion.txt')).toBe('text');
    expect(detectDocumentFormat('documento', 'application/pdf')).toBe('pdf');
    expect(detectDocumentFormat('archivo', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('docx');
  });

  it('valida extensiones y MIME types permitidos', () => {
    expect(isAllowedDocumentFile({ name: 'contrato.pdf', mimeType: 'application/pdf' })).toBe(true);
    expect(isAllowedDocumentFile({ name: 'anexo.docx' })).toBe(true);
    expect(isAllowedDocumentFile({ name: 'cfdi.xml' })).toBe(true);
    expect(isAllowedDocumentFile({ name: 'script.exe' })).toBe(false);
  });

  it('procesa y estructura facturas CFDI 4.0 con metadatos fiscales completos', () => {
    const cfdiSample = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="4.0" Serie="F" Folio="1054" Fecha="2026-08-10T14:30:00" FormaPago="03" MetodoPago="PPD" SubTotal="100000.00" Total="116000.00" Moneda="MXN" TipoDeComprobante="I" LugarExpedicion="06600">
  <cfdi:Emisor Rfc="LAN850101XYZ" Nombre="LOGISTICA AVANZADA DEL NORTE SA DE CV" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="COM901231ABC" Nombre="COMERCIALIZADORA DEL GOLFO SA DE CV" UsoCFDI="G03" DomicilioFiscalReceptor="97000" RegimenFiscalReceptor="601"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="78101802" Cantidad="1" ClaveUnidad="E48" Descripcion="Servicio de flete y logistica aduanal de importacion" ValorUnitario="100000.00" Importe="100000.00" ObjetoImp="02"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital UUID="9B6F3E7C-4C8D-4F1E-9C3A-1B2C3D4E5F6A" FechaTimbrado="2026-08-10T14:35:12" RfcProvCertif="SAT970701NN3"/>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    const parsed = parseXmlOrCfdi(cfdiSample, 'factura_flete.xml');
    expect(parsed.format).toBe('cfdi');
    expect(parsed.metadata?.uuid).toBe('9B6F3E7C-4C8D-4F1E-9C3A-1B2C3D4E5F6A');
    expect(parsed.metadata?.emisorRfc).toBe('LAN850101XYZ');
    expect(parsed.metadata?.receptorRfc).toBe('COM901231ABC');
    expect(parsed.metadata?.total).toBe('116000.00');

    expect(parsed.text).toContain('COMPROBANTE FISCAL DIGITAL POR INTERNET');
    expect(parsed.text).toContain('9B6F3E7C-4C8D-4F1E-9C3A-1B2C3D4E5F6A');
    expect(parsed.text).toContain('LOGISTICA AVANZADA DEL NORTE SA DE CV');
    expect(parsed.text).toContain('Servicio de flete y logistica aduanal de importacion');
  });

  it('extrae contenido de texto plano y markdown limpiamente', async () => {
    const mdBuffer = Buffer.from('# Contrato de Mutuo\n\nCláusula Primera: El prestamista entrega...', 'utf8');
    const result = await extractDocumentContent(mdBuffer, 'contrato_mutuo.md', 'text/markdown');

    expect(result.format).toBe('markdown');
    expect(result.text).toContain('# Contrato de Mutuo');
    expect(result.contentHash).toBe(sha256Content(result.text));
    expect(result.pages.length).toBe(1);
  });

  it('arroja error ante buffers vacíos', async () => {
    await expect(extractDocumentContent(Buffer.alloc(0), 'vacio.txt'))
      .rejects
      .toThrow("El archivo 'vacio.txt' está vacío.");
  });
});
