import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';

export interface DocxExportResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
}

export interface LegalDocxOptions {
  title: string;
  subtitle?: string;
  filenamePrefix?: string;
  ecosystem?: string;
  parties?: string[];
}

function parseMarkdownLineToRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|([^*`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      runs.push(new TextRun({ text: match[2], bold: true, font: 'Georgia' }));
    } else if (match[3]) {
      // Italic
      runs.push(new TextRun({ text: match[3], italics: true, font: 'Georgia' }));
    } else if (match[4]) {
      // Monospace / Code
      runs.push(new TextRun({ text: match[4], font: 'Consolas', size: 18 }));
    } else if (match[5]) {
      // Normal text
      runs.push(new TextRun({ text: match[5], font: 'Georgia' }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font: 'Georgia' })];
}

export async function generateDocumentDocx(
  content: string,
  options: LegalDocxOptions
): Promise<DocxExportResult> {
  const {
    title,
    subtitle = 'Instrumento Jurídico con Validez Legal',
    filenamePrefix = 'Documento_Legal',
    ecosystem = 'Corporativo',
    parties = [],
  } = options;

  const paragraphs: (Paragraph | Table)[] = [];

  // Document Title
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 32, // 16pt
          color: '0F172A',
          font: 'Georgia',
        }),
      ],
    })
  );

  // Subtitle / Date / Reference
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: subtitle,
          italics: true,
          size: 20, // 10pt
          color: '64748B',
          font: 'Georgia',
        }),
        new TextRun({
          text: `  |  Materia: ${ecosystem.toUpperCase()}  |  Fecha: ${new Date().toLocaleDateString('es-MX')}`,
          size: 18,
          color: '94A3B8',
          font: 'Georgia',
        }),
      ],
    })
  );

  // Parse lines
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 120 } }));
      continue;
    }

    if (trimmed.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: trimmed.replace(/^#\s+/, '').toUpperCase(),
              bold: true,
              size: 26,
              color: '1E293B',
              font: 'Georgia',
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: trimmed.replace(/^##\s+/, ''),
              bold: true,
              size: 24,
              color: '334155',
              font: 'Georgia',
            }),
          ],
        })
      );
    } else if (trimmed.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: trimmed.replace(/^###\s+/, ''),
              bold: true,
              size: 22,
              color: '475569',
              font: 'Georgia',
            }),
          ],
        })
      );
    } else if (/^[-*•]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*•]\s+/, '');
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: parseMarkdownLineToRuns(bulletText),
        })
      );
    } else if (/^(?:CL[AÁ]USULA|DECLARACI[OÓ]N|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SIMA)/i.test(trimmed)) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { before: 140, after: 100 },
          children: parseMarkdownLineToRuns(trimmed),
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 100 },
          children: parseMarkdownLineToRuns(trimmed),
        })
      );
    }

  }

  // Add Signatures Table if parties exist or default signature block
  const signParties = parties.length > 0 ? parties : ['LA PARTE ACREDITADA / CONTRATANTE', 'LA PARTE PRESTADORA / AVAL'];
  const signatureCells: TableCell[] = signParties.slice(0, 3).map((party) => {
    return new TableCell({
      width: { size: Math.floor(100 / signParties.length), type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 60 },
          children: [
            new TextRun({
              text: '________________________________________',
              color: '475569',
              font: 'Georgia',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: party,
              bold: true,
              size: 18,
              color: '0F172A',
              font: 'Georgia',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Firma y Razón Social',
              italics: true,
              size: 16,
              color: '94A3B8',
              font: 'Georgia',
            }),
          ],
        }),
      ],
    });
  });

  paragraphs.push(
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: 'FIRMAS DE CONFORMIDAD Y RATIFICACIÓN',
          bold: true,
          size: 20,
          color: '334155',
          font: 'Georgia',
        }),
      ],
    })
  );

  paragraphs.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: signatureCells })],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch (72 pt * 20)
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'LEX CORPORATIVO | INGENIERÍA LEGAL Y DICTAMEN',
                    size: 16,
                    color: '94A3B8',
                    font: 'Georgia',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${title}  —  Confidencial  —  Página `,
                    size: 16,
                    color: '94A3B8',
                    font: 'Georgia',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Georgia',
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Georgia',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Georgia',
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${filenamePrefix}_${Date.now()}.docx`;

  if (typeof window !== 'undefined' && window.lexDesktop?.documents?.exportDocx) {
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return window.lexDesktop.documents.exportDocx({ base64, defaultPath: fileName });
  }

  // Fallback in browser
  if (typeof document !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { success: true, filePath: fileName };
}

