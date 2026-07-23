import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalizeProvisionId } from './official-fiscal-parser.mjs';

function regexFrom(source) {
  return new RegExp(source, 'gimu');
}

const ARTICLE_HEADER_SOURCE = String.raw`^\s*Art[íi]culo\s+(\d+(?:o|º|°)?(?:(?:\.-|-)(?:BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES|[A-Z]))?(?:\s+(?:BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES))?)(?:\.\s*-|[.\-–—])`;
const RULE_HEADER_SOURCE = String.raw`^\s*(\d+(?:\.\d+){1,3})\.\s+(?=\S)`;

function groupTextItemsByLine(items) {
  const lines = [];
  for (const item of items.filter(candidate => 'str' in candidate)) {
    const y = item.transform?.[5] ?? 0;
    let line = lines.find(candidate => Math.abs(candidate.y - y) < 0.6);
    if (!line) {
      line = { y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }
  return lines
    .map(line => ({ ...line, items: line.items.sort((left, right) => left.transform[4] - right.transform[4]) }))
    .sort((left, right) => right.y - left.y);
}

function headingIdFromLine(line, kind) {
  const text = line.items.map(item => item.str).join('').replace(/\s+/g, ' ').trim();
  const match = kind === 'rule'
    ? text.match(/^(\d+(?:\.\d+){1,3})\.\s+/)
    : text.match(/^Art[íi]culo\s+(\d+(?:o|º|°)?(?:(?:\.-|-)(?:BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES|[A-Z]))?(?:\s+(?:BIS|TER|QU[AÁ]TER|QUINQUIES|SEXIES|SEPTIES|OCTIES|NONIES))?)(?:\.\s*-|[.\-–—])/i);
  return match?.[1] || null;
}

async function extractStyledHeadings(filePath, kind) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(filePath)) }).promise;
  const headingsByPage = new Map();
  let headingFont = null;
  const headerSource = kind === 'rule' ? RULE_HEADER_SOURCE : ARTICLE_HEADER_SOURCE;

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const lines = groupTextItemsByLine(textContent.items);

      if (!headingFont) {
        const firstHeading = lines.find(line => {
          const id = normalizeProvisionId(headingIdFromLine(line, kind) || '', kind);
          const firstTextItem = line.items.find(item => item.str.trim());
          const x = firstTextItem?.transform?.[4] ?? Number.POSITIVE_INFINITY;
          return x < 120 && (kind === 'rule' ? Boolean(id) : id === '1');
        });
        headingFont = firstHeading?.items.find(item => item.str.trim())?.fontName || null;
      }

      if (!headingFont) continue;
      const pageHeadings = lines.flatMap(line => {
        const firstTextItem = line.items.find(item => item.str.trim());
        const id = headingIdFromLine(line, kind);
        const x = firstTextItem?.transform?.[4] ?? Number.POSITIVE_INFINITY;
        if (!id || firstTextItem?.fontName !== headingFont || x > 120) return [];
        return [{ id: normalizeProvisionId(id, kind) }];
      });
      if (pageHeadings.length) headingsByPage.set(pageNumber, pageHeadings);
    }
  } finally {
    await document.destroy();
  }
  return headingsByPage;
}

export async function parseOfficialPdf(filePath, kind = 'article') {
  const parser = new PDFParse({ url: filePath });
  try {
    const [textResult, headingsByPage] = await Promise.all([
      parser.getText(),
      extractStyledHeadings(filePath, kind),
    ]);
    return {
      ...textResult,
      pages: textResult.pages.map(page => ({ ...page, headings: headingsByPage.get(page.num) || [] })),
    };
  } finally {
    await parser.destroy();
  }
}
