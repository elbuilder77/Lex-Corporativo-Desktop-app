import { jsPDF } from 'jspdf';

type RGB = [number, number, number];

export interface PDFExportResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
}

async function savePdf(doc: jsPDF, fileName: string): Promise<PDFExportResult> {
  if (window.lexDesktop?.documents?.exportPdf) {
    const base64 = doc.output('datauristring');
    return window.lexDesktop.documents.exportPdf({ base64, defaultPath: fileName });
  }

  doc.save(fileName);
  return { success: true, filePath: fileName };
}

export const generateDocumentPDF = async (
  content: string, 
  title: string, 
  subtitle: string, 
  filenamePrefix: string = 'Documento',
  headerColor: RGB = [15, 23, 42],
  themeColor: RGB = [212, 175, 55],
): Promise<PDFExportResult> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 20;

  // Header
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(...themeColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, margin, 32);

  currentY = 50;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85); // slate-700
  
  const lines = content.split('\n');
  
  lines.forEach((line: string) => {
    if (currentY > 280) {
      doc.addPage();
      currentY = 20;
    }

    let text = line.trim();
    if (!text) {
      currentY += 3;
      return;
    }

    let isHeading = false;
    let headingLevel = 0;
    let isBullet = false;

    if (text.startsWith('# ')) { isHeading = true; headingLevel = 1; text = text.substring(2); }
    else if (text.startsWith('## ')) { isHeading = true; headingLevel = 2; text = text.substring(3); }
    else if (text.startsWith('### ')) { isHeading = true; headingLevel = 3; text = text.substring(4); }
    else if (text.match(/^[-*]\s/)) { isBullet = true; text = text.substring(2); }

    // Limpiar asteriscos de negritas para jsPDF
    text = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');

    if (isHeading) {
      doc.setFont('helvetica', 'bold');
      if (headingLevel === 1) { doc.setFontSize(16); doc.setTextColor(...themeColor); }
      else if (headingLevel === 2) { doc.setFontSize(14); doc.setTextColor(15, 23, 42); }
      else { doc.setFontSize(12); doc.setTextColor(51, 65, 85); }
      currentY += 4;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
    }

    const xOffset = isBullet ? margin + 6 : margin;
    const textWidth = contentWidth - (isBullet ? 6 : 0);
    
    const splitLines = doc.splitTextToSize(text, textWidth);
    
    splitLines.forEach((splitLine: string, index: number) => {
      if (currentY > 280) {
        doc.addPage();
        currentY = 20;
      }
      if (isBullet && index === 0) {
        doc.setFillColor(themeColor[0], themeColor[1], themeColor[2]);
        doc.circle(margin + 2, currentY - 1, 1, 'F');
      }
      doc.text(splitLine, xOffset, currentY);
      currentY += 5;
    });
    
    if (isHeading) currentY += 2;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`${title} | Página ${i} de ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
    doc.text(`Confidencial - Generado por ${title}`, pageWidth / 2, 290, { align: 'center' });
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
    headerColor = [15, 23, 42],
    themeColor = [212, 175, 55]
  } = params;

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true
  });

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 25;

  // Header
  doc.setFillColor(...headerColor);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(...themeColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text(title, margin, 25);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, margin, 35);
  
  doc.setFontSize(8);
  doc.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString()} | ID: ${crypto.randomUUID().split('-')[0].toUpperCase()}`, margin, 40);

  currentY = 60;

  // Score
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 25, 3, 3, 'F');
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ÍNDICE DE EXPOSICIÓN LEGAL:', margin + 10, currentY + 10);
  
  const scoreColor: RGB = riskScore > 70 ? [220, 38, 38] : riskScore > 40 ? [217, 119, 6] : [5, 150, 105];
  doc.setTextColor(...scoreColor);
  doc.setFontSize(18);
  doc.text(`${riskScore} / 100`, margin + 10, currentY + 18);
  
  const riskLevel = riskScore > 70 ? 'CRÍTICO' : riskScore > 40 ? 'MODERADO' : 'CONTROLADO';
  doc.setFontSize(10);
  doc.text(`NIVEL DE RIESGO: ${riskLevel}`, margin + 60, currentY + 18);

  currentY += 40;

  let sectionNumber = 1;

  // Summary (if exists)
  if (summary) {
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${sectionNumber++}. RESUMEN EJECUTIVO`, margin, currentY);
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(summary, contentWidth);
    doc.text(summaryLines, margin, currentY);
    currentY += (summaryLines.length * 5) + 15;
  }

  // Pillars
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${sectionNumber++}. EJES ESTRATÉGICOS`, margin, currentY);
  currentY += 10;

  pillars.forEach((p) => {
    if (currentY > 260) { doc.addPage(); currentY = 20; }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...themeColor);
    doc.text(p.title, margin, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(p.content, contentWidth);
    doc.text(lines, margin, currentY);
    currentY += (lines.length * 5) + 10;
  });

  // Risks
  if (currentY > 240) { doc.addPage(); currentY = 20; }
  currentY += 5;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`${sectionNumber++}. HALLAZGOS ESPECÍFICOS`, margin, currentY);
  currentY += 10;

  risks.forEach((risk, i) => {
    if (currentY > 270) { doc.addPage(); currentY = 20; }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${i + 1}.`, margin, currentY);
    
    doc.setFont('helvetica', 'normal');
    const riskLines = doc.splitTextToSize(risk, contentWidth - 10);
    doc.text(riskLines, margin + 8, currentY);
    currentY += (riskLines.length * 5) + 5;
  });

  // Recommendation
  if (currentY > 250) { doc.addPage(); currentY = 20; }
  currentY += 10;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, currentY, contentWidth, 30, 3, 3, 'F');
  
  doc.setTextColor(...themeColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RECOMENDACIÓN FINAL:', margin + 10, currentY + 10);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const recLines = doc.splitTextToSize(recommendation, contentWidth - 20);
  doc.text(recLines, margin + 10, currentY + 18);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`${moduleName} | Página ${i} de ${pageCount}`, pageWidth / 2, 285, { align: 'center' });
    doc.text(`Confidencial - Generado por ${moduleName}`, pageWidth / 2, 290, { align: 'center' });
  }

  const fileName = `${filenamePrefix}_${new Date().getTime()}.pdf`;
  return savePdf(doc, fileName);
};
