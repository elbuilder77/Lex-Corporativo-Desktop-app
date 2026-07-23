type PdfModule = typeof import('./pdf-generator');

export async function generateAnalysisPDF(
  ...args: Parameters<PdfModule['generateAnalysisPDF']>
): ReturnType<PdfModule['generateAnalysisPDF']> {
  const pdf = await import('./pdf-generator');
  return pdf.generateAnalysisPDF(...args);
}

export async function generateDocumentPDF(
  ...args: Parameters<PdfModule['generateDocumentPDF']>
): ReturnType<PdfModule['generateDocumentPDF']> {
  const pdf = await import('./pdf-generator');
  return pdf.generateDocumentPDF(...args);
}
