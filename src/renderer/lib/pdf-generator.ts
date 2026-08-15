import { jsPDF } from 'jspdf';
import logoMarkUrl from '../assets/logo-mark.png';

type RGB = [number, number, number];

export interface PDFExportResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
}

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  if (typeof document === 'undefined') return null;

  try {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Logo image failed to load'));
      img.src = logoMarkUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 120;
    canvas.height = img.naturalHeight || 120;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      cachedLogoDataUri = canvas.toDataURL('image/png');
      return cachedLogoDataUri;
    }
  } catch {
    // Fallback if image loading is not available in node/test env
  }
  return null;
}

async function savePdf(doc: jsPDF, fileName: string): Promise<PDFExportResult> {
  if (window.lexDesktop?.documents?.exportPdf) {
    const base64 = doc.output('datauristring');
    return window.lexDesktop.documents.exportPdf({ base64, defaultPath: fileName });
  }

  doc.save(fileName);
  return { success: true, filePath: fileName };
}

function drawDiscreetHeader(doc: jsPDF, logoDataUri: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  if (logoDataUri) {
    try {
      doc.addImage(logoDataUri, 'PNG', margin, 8, 8, 8);
    } catch {
      // Ignore if image drawing fails
    }
  }

  const textStartX = logoDataUri ? margin + 10 : margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('LEX CORPORATIVO', textStartX, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('INGENIERÍA JURÍDICA Y DICTAMEN NORMATIVO', textStartX, 15.5);

  // Right-aligned discreet date
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }).toUpperCase();
  doc.text(dateStr, pageWidth - margin, 13, { align: 'right' });

  // Discreet divider line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.line(margin, 18.5, pageWidth - margin, 18.5);
}

function drawDiscreetFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Footer divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, 282, pageWidth - margin, 282);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Documento Jurídico Privado · Confidencial', margin, 287);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, 287, { align: 'right' });
}

interface TextWord {
  word: string;
  isBold: boolean;
  isItalic: boolean;
}

function parseLineToWords(text: string): TextWord[] {
  const words: TextWord[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|([^*]+))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // Bold
      const tokens = match[2].split(/\s+/).filter(Boolean);
      tokens.forEach(w => words.push({ word: w, isBold: true, isItalic: false }));
    } else if (match[3]) {
      // Italic
      const tokens = match[3].split(/\s+/).filter(Boolean);
      tokens.forEach(w => words.push({ word: w, isBold: false, isItalic: true }));
    } else if (match[4]) {
      const tokens = match[4].split(/\s+/).filter(Boolean);
      tokens.forEach(w => words.push({ word: w, isBold: false, isItalic: false }));
    }
  }

  return words;
}

export const generateDocumentPDF = async (
  content: string,
  title: string,
  subtitle: string,
  filenamePrefix: string = 'Documento',
  _headerColor?: RGB,
  _themeColor?: RGB,
): Promise<PDFExportResult> => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  const logoDataUri = await getLogoDataUri();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 28;

  // Draw header on page 1
  drawDiscreetHeader(doc, logoDataUri);

  // Document Title (Traditional Centered Header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900

  const titleLines = doc.splitTextToSize(title.toUpperCase(), contentWidth);
  titleLines.forEach((tl: string) => {
    doc.text(tl, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5.5;
  });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  currentY += 4;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    let trimmed = rawLine.trim();

    if (!trimmed) {
      currentY += 3.5;
      continue;
    }

    // Check page overflow
    if (currentY > 270) {
      doc.addPage();
      drawDiscreetHeader(doc, logoDataUri);
      currentY = 28;
    }

    // Section headings (DECLARACIONES, CLÁUSULAS, etc.)
    const isMainHeading = trimmed.startsWith('# ') || /^(?:DECLARACIONES|CL[AÁ]USULAS|TRANSITORIOS|PROEMIO|ANTECEDENTES|CAP[IÍ]TULO|FIRMAS)(?:[\s\.\:\-]|$)/i.test(trimmed);
    const isSubHeading = trimmed.startsWith('## ') || trimmed.startsWith('### ');
    const isBullet = /^[-*•]\s+/.test(trimmed);

    if (isMainHeading) {
      if (currentY > 255) {
        doc.addPage();
        drawDiscreetHeader(doc, logoDataUri);
        currentY = 28;
      }
      currentY += 3;
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').toUpperCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(headingText, pageWidth / 2, currentY, { align: 'center' });
      currentY += 6;
      continue;
    }

    if (isSubHeading) {
      if (currentY > 260) {
        doc.addPage();
        drawDiscreetHeader(doc, logoDataUri);
        currentY = 28;
      }
      currentY += 2.5;
      const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(headingText, margin, currentY);
      currentY += 5.5;
      continue;
    }

    // Clause headings detection (e.g. PRIMERA.- OBJETO, CLÁUSULA SEGUNDA.- PRECIO, I.- ...)
    const isClauseLine = /^(?:CL[AÁ]USULA\s+[A-ZÁÉÍÓÚÑ\-]+|PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[EÉ]PTIMA|OCTAVA|NOVENA|D[EÉ]CIMA|VIG[EÉ]SIMA|TRIG[EÉ]SIMA)[\.\:\-]/i.test(trimmed);
    if (isClauseLine && !trimmed.startsWith('**')) {
      // Ensure clause keyword has bold styling
      trimmed = `**${trimmed.replace(/([\.\:\-])\s*/, '$1** ')}`;
    }

    // Parse words with bold/normal flags
    const words = parseLineToWords(trimmed.replace(/^[-*•]\s+/, ''));
    if (words.length === 0) continue;

    const xStart = isBullet ? margin + 6 : margin;
    const availableWidth = contentWidth - (isBullet ? 6 : 0);

    doc.setFontSize(9.5);
    const lineHeight = 4.8;

    // Draw bullet dot if needed
    if (isBullet) {
      doc.setFillColor(71, 85, 105);
      doc.circle(margin + 2.5, currentY - 1, 0.8, 'F');
    }

    let lineWords: TextWord[] = [];
    let currentLineWidth = 0;

    for (let wIdx = 0; wIdx < words.length; wIdx++) {
      const item = words[wIdx];
      doc.setFont('helvetica', item.isBold ? 'bold' : item.isItalic ? 'italic' : 'normal');
      const wordWidth = doc.getTextWidth(item.word + ' ');

      if (currentLineWidth + wordWidth > availableWidth && lineWords.length > 0) {
        // Print current line
        if (currentY > 272) {
          doc.addPage();
          drawDiscreetHeader(doc, logoDataUri);
          currentY = 28;
        }

        let cursorX = xStart;
        for (const lw of lineWords) {
          doc.setFont('helvetica', lw.isBold ? 'bold' : lw.isItalic ? 'italic' : 'normal');
          doc.setTextColor(lw.isBold ? 15 : 45, lw.isBold ? 23 : 55, lw.isBold ? 42 : 72);
          doc.text(lw.word, cursorX, currentY);
          cursorX += doc.getTextWidth(lw.word + ' ');
        }

        currentY += lineHeight;
        lineWords = [item];
        currentLineWidth = wordWidth;
      } else {
        lineWords.push(item);
        currentLineWidth += wordWidth;
      }
    }

    // Print remaining words of the paragraph
    if (lineWords.length > 0) {
      if (currentY > 272) {
        doc.addPage();
        drawDiscreetHeader(doc, logoDataUri);
        currentY = 28;
      }

      let cursorX = xStart;
      for (const lw of lineWords) {
        doc.setFont('helvetica', lw.isBold ? 'bold' : lw.isItalic ? 'italic' : 'normal');
        doc.setTextColor(lw.isBold ? 15 : 45, lw.isBold ? 23 : 55, lw.isBold ? 42 : 72);
        doc.text(lw.word, cursorX, currentY);
        cursorX += doc.getTextWidth(lw.word + ' ');
      }
      currentY += lineHeight + 0.5;
    }
  }

  // Draw footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawDiscreetFooter(doc, p, totalPages);
  }

  const fileName = `${filenamePrefix}_${new Date().getTime()}.pdf`;
  return savePdf(doc, fileName);
};

export interface AnalysisPDFParams {
  title: string;
  subtitle: string;
  riskScore: number;
  summary?: string;
  pillars: { title: string; content: string }[];
  risks: string[];
  recommendation: string;
  moduleName: string;
  filenamePrefix: string;
  headerColor?: RGB;
  themeColor?: RGB;
}

export const generateAnalysisPDF = async (params: AnalysisPDFParams): Promise<PDFExportResult> => {
  const {
    title, subtitle, riskScore, summary, pillars, risks, recommendation,
    moduleName, filenamePrefix,
  } = params;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
  });

  const logoDataUri = await getLogoDataUri();
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 28;

  // Discreet Header
  drawDiscreetHeader(doc, logoDataUri);

  // Title of the Audit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), margin, currentY);
  currentY += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, margin, currentY);
  currentY += 8;

  // Exposure Metric Card (Traditional clean bordered box)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDICE DE EXPOSICIÓN LEGAL:', margin + 8, currentY + 8);

  const scoreColor: RGB = riskScore > 70 ? [220, 38, 38] : riskScore > 40 ? [217, 119, 6] : [5, 150, 105];
  doc.setTextColor(...scoreColor);
  doc.setFontSize(14);
  doc.text(`${riskScore} / 100`, margin + 8, currentY + 15);

  const riskLevel = riskScore > 70 ? 'CRÍTICO / ALTO RIESGO' : riskScore > 40 ? 'MODERADO / AMBIGÜEDAD' : 'CONTROLADO / CUMPLIMIENTO ADECUADO';
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(`DIAGNÓSTICO: ${riskLevel}`, margin + 55, currentY + 15);

  currentY += 27;

  let sectionNumber = 1;

  // Summary
  if (summary) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNumber++}. RESUMEN EJECUTIVO`, margin, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(summary, contentWidth);
    doc.text(summaryLines, margin, currentY);
    currentY += (summaryLines.length * 4.8) + 8;
  }

  // Strategic Pillars
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${sectionNumber++}. EVALUACIÓN POR EJES NORMATIVOS`, margin, currentY);
  currentY += 7;

  pillars.forEach((p) => {
    if (currentY > 260) {
      doc.addPage();
      drawDiscreetHeader(doc, logoDataUri);
      currentY = 28;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(p.title, margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(p.content, contentWidth);
    doc.text(lines, margin, currentY);
    currentY += (lines.length * 4.5) + 6;
  });

  // Risks
  if (currentY > 240) {
    doc.addPage();
    drawDiscreetHeader(doc, logoDataUri);
    currentY = 28;
  }
  currentY += 3;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${sectionNumber++}. HALLAZGOS Y RIESGOS ESPECÍFICOS`, margin, currentY);
  currentY += 7;

  risks.forEach((risk, i) => {
    if (currentY > 265) {
      doc.addPage();
      drawDiscreetHeader(doc, logoDataUri);
      currentY = 28;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${i + 1}.`, margin, currentY);

    doc.setFont('helvetica', 'normal');
    const riskLines = doc.splitTextToSize(risk, contentWidth - 8);
    doc.text(riskLines, margin + 6, currentY);
    currentY += (riskLines.length * 4.5) + 4;
  });

  // Recommendation Card
  if (currentY > 245) {
    doc.addPage();
    drawDiscreetHeader(doc, logoDataUri);
    currentY = 28;
  }
  currentY += 5;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('RECOMENDACIÓN Y PLAN DE ACCIÓN:', margin, currentY);
  currentY += 5.5;

  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const recLines = doc.splitTextToSize(recommendation, contentWidth);
  doc.text(recLines, margin, currentY);
  currentY += (recLines.length * 4.5) + 6;

  // Footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawDiscreetFooter(doc, p, totalPages);
  }

  const fileName = `${filenamePrefix}_${new Date().getTime()}.pdf`;
  return savePdf(doc, fileName);
};
