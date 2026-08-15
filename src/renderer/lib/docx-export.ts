type DocxModule = typeof import('./docx-generator');

export async function generateDocumentDocx(
  ...args: Parameters<DocxModule['generateDocumentDocx']>
): ReturnType<DocxModule['generateDocumentDocx']> {
  const docx = await import('./docx-generator');
  return docx.generateDocumentDocx(...args);
}
