import { describe, expect, it } from 'vitest';
import { selectFiscalCitations, type FiscalCitation } from './FiscalNormativeLibrary';

const citations: FiscalCitation[] = [
  { id: 'rmf-1', law_code: 'RMF', content: 'Regla miscelánea' },
  { id: 'cff-1', law_code: 'CFF', article_number: '69-B', content: 'Código Fiscal' },
  { id: 'cff-2', law_code: 'cff', article_number: '29-A', content: 'Código Fiscal' },
];

describe('Fiscal normative selection', () => {
  it('prioritizes only the selected law when exact records exist', () => {
    const selected = selectFiscalCitations(citations, 'CFF');
    expect(selected.related).toBe(false);
    expect(selected.results.map((item) => item.id)).toEqual(['cff-1', 'cff-2']);
  });

  it('marks a fallback as related when the selected law is absent', () => {
    const selected = selectFiscalCitations(citations, 'LIVA');
    expect(selected.related).toBe(true);
    expect(selected.results).toEqual(citations);
  });
});
