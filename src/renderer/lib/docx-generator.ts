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

const LEGAL_FONT = 'Georgia';

function parseMarkdownLineToRuns(text: string, defaultBold: boolean = false): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|([^*`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Explicit bold
      runs.push(new TextRun({ text: match[2], bold: true, font: LEGAL_FONT, size: 21, color: '0F172A' }));
    } else if (match[3]) {
      // Italic
      runs.push(new TextRun({ text: match[3], italics: true, bold: defaultBold, font: LEGAL_FONT, size: 21, color: '1E293B' }));
    } else if (match[4]) {
      // Code / reference
      runs.push(new TextRun({ text: match[4], font: 'Consolas', size: 18, color: '334155' }));
    } else if (match[5]) {
      // Normal text
      runs.push(new TextRun({ text: match[5], bold: defaultBold, font: LEGAL_FONT, size: 21, color: '1E293B' }));
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, bold: defaultBold, font: LEGAL_FONT, size: 21, color: '1E293B' })];
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

  // Document Title (Centered, Formal Bold Uppercase)
  paragraphs.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 80 },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 26, // 13pt
          color: '0F172A',
          font: LEGAL_FONT,
        }),
      ],
    })
  );

  // Subtitle / Date / Reference (Discreet)
  if (subtitle) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 260 },
        children: [
          new TextRun({
            text: subtitle,
            italics: true,
            size: 18, // 9pt
            color: '64748B',
            font: LEGAL_FONT,
          }),
          new TextRun({
            text: `  ·  ${ecosystem.toUpperCase()}  ·  ${new Date().toLocaleDateString('es-MX')}`,
            size: 17,
            color: '94A3B8',
            font: LEGAL_FONT,
          }),
        ],
      })
    );
  }

  // Parse lines
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      paragraphs.push(new Paragraph({ spacing: { after: 100 } }));
      continue;
    }

    // Section headings (DECLARACIONES, CLÁUSULAS, PROEMIO, etc.)
    const isMainHeading = trimmed.startsWith('# ') || /^(?:DECLARACIONES|CL[AÁ]USULAS|TRANSITORIOS|PROEMIO|ANTECEDENTES|CAP[IÍ]TULO|FIRMAS)(?:[\s\.\:\-]|$)/i.test(trimmed);
    const isSubHeading = trimmed.startsWith('## ') || trimmed.startsWith('### ');

    if (isMainHeading) {
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').toUpperCase();
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              size: 23, // 11.5pt
              color: '0F172A',
              font: LEGAL_FONT,
            }),
          ],
        })
      );
    } else if (isSubHeading) {
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 180, after: 80 },
          children: [
            new TextRun({
              text: headingText,
              bold: true,
              size: 22,
              color: '1E293B',
              font: LEGAL_FONT,
            }),
          ],
        })
      );
    } else if (/^[-*•]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[-*•]\s+/, '');
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 70 },
          children: parseMarkdownLineToRuns(bulletText),
        })
      );
    } else {
      // Check for Clause Header prefix (e.g. PRIMERA.- OBJETO, CLÁUSULA SEGUNDA.- ...)
      const clauseMatch = trimmed.match(/^((?:CL[AÁ]USULA\s+[A-ZÁÉÍÓÚÑ\-]+|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SIMA|TRIG[EÉ]SIMA|I\.|II\.|III\.|IV\.|V\.|A\)|B\)|C\))[\.\:\-]?\s*)(.*)$/i);

      if (clauseMatch && !trimmed.startsWith('**')) {
        const prefix = clauseMatch[1];
        const rest = clauseMatch[2];
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, after: 90 },
            children: [
              new TextRun({
                text: prefix,
                bold: true,
                font: LEGAL_FONT,
                size: 21,
                color: '0F172A',
              }),
              ...parseMarkdownLineToRuns(rest),
            ],
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 90 },
            children: parseMarkdownLineToRuns(trimmed),
          })
        );
      }
    }
  }

  // Add Formal Signatures Table if parties exist or default signature block
  const signParties = parties.length > 0 ? parties : ['LA PARTE CONTRATANTE / ACREDITADA', 'LA PARTE PRESTADORA / AVAL'];
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
          spacing: { before: 360, after: 60 },
          children: [
            new TextRun({
              text: '________________________________________',
              color: '475569',
              font: LEGAL_FONT,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 30 },
          children: [
            new TextRun({
              text: party,
              bold: true,
              size: 19,
              color: '0F172A',
              font: LEGAL_FONT,
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
              font: LEGAL_FONT,
            }),
          ],
        }),
      ],
    });
  });

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 80 },
      children: [
        new TextRun({
          text: 'FIRMAS DE CONFORMIDAD Y RATIFICACIÓN',
          bold: true,
          size: 21,
          color: '1E293B',
          font: LEGAL_FONT,
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
                    text: 'LEX CORPORATIVO  ·  INGENIERÍA JURÍDICA',
                    size: 16, // 8pt
                    color: '94A3B8',
                    font: LEGAL_FONT,
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
                    font: LEGAL_FONT,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: LEGAL_FONT,
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 16,
                    color: '94A3B8',
                    font: LEGAL_FONT,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: LEGAL_FONT,
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
    const base64 = await blobToBase64(blob);
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

async function blobToBase64(blob: Blob): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const arrayBuffer = await blob.arrayBuffer();
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arrayBuffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : '';
}
