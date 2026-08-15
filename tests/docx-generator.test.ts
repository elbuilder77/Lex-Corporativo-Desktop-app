import { describe, expect, it } from 'vitest';
import { generateDocumentDocx } from '../src/renderer/lib/docx-generator';

describe('docx-generator motor de exportación a Word', () => {
  it('genera un documento Word estructurado con encabezados, cláusulas y firmas', async () => {
    const legalText = `# CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES

## DECLARACIONES
I. Declara el PRESTADOR que cuenta con la experiencia técnica y capacidad jurídica.
II. Declara el CLIENTE que requiere los servicios especializados descritos en el presente instrumento.

## CLÁUSULAS
CLÁUSULA PRIMERA.- OBJETO.
El PRESTADOR se obliga a ejecutar la consultoría y dictamen de cumplimiento legal.

CLÁUSULA SEGUNDA.- CONTRAPRESTACIÓN Y CFDI.
El CLIENTE pagará la cantidad acordada mediante transferencia bancaria y previa emisión del CFDI 4.0.

- Entregable 1: Diagnóstico de riesgos contractuales.
- Entregable 2: Matriz de auditoría y recomendaciones.`;

    const result = await generateDocumentDocx(legalText, {
      title: 'Contrato de Servicios Profesionales',
      subtitle: 'Ingeniería Jurídica',
      filenamePrefix: 'Contrato_Servicios',
      ecosystem: 'Corporativo',
      parties: ['CLIENTE EJEMPLO SA DE CV', 'PRESTADOR PROFESIONAL SC'],
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.filePath).toContain('.docx');
  });
});
