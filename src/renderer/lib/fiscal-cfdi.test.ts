import { describe, expect, it } from 'vitest';
import { formatCfdiContext, parseCfdiXml } from './fiscal-cfdi';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante Version="4.0" Fecha="2026-07-28T10:00:00" Total="1160.00" Moneda="MXN">
  <cfdi:Emisor Rfc="AAA010101AAA" />
  <cfdi:Receptor Rfc="BBB010101BBB" />
  <cfdi:Complemento><tfd:TimbreFiscalDigital UUID="123E4567-E89B-12D3-A456-426614174000" /></cfdi:Complemento>
</cfdi:Comprobante>`;

describe('local CFDI reading', () => {
  it('extracts the minimum operational data without claiming SAT validation', () => {
    expect(parseCfdiXml(xml, 'factura.xml')).toEqual({
      fileName: 'factura.xml',
      uuid: '123E4567-E89B-12D3-A456-426614174000',
      version: '4.0',
      issuerRfc: 'AAA010101AAA',
      receiverRfc: 'BBB010101BBB',
      total: '1160.00',
      currency: 'MXN',
      issuedAt: '2026-07-28T10:00:00',
    });
  });

  it('formats parsed fields as explicit analysis context', () => {
    const context = formatCfdiContext([parseCfdiXml(xml, 'factura.xml')]);
    expect(context).toContain('UUID: 123E4567-E89B-12D3-A456-426614174000');
    expect(context).toContain('RFC emisor: AAA010101AAA');
    expect(context).toContain('Total: 1160.00 MXN');
  });
});
