import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => process.cwd(),
  },
}));

import {
  getInstalledCorpusLaw,
  getLegalCorpusOverview,
  isLegalCorpusAvailable,
  readLegalCorpusLawContent,
  resolveCorpusFile,
} from './legal-corpus';

describe('legal corpus catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes the complete installed corpus without source URLs', () => {
    const overview = getLegalCorpusOverview();

    expect(overview.lawsCount).toBe(16);
    expect(overview.provisionsCount).toBe(7348);
    expect(overview.laws).toHaveLength(16);
    expect(overview.laws.reduce((total, law) => total + law.provisions, 0)).toBe(7348);
    expect(overview.laws.find((law) => law.code === 'LFT')).toMatchObject({
      name: 'Ley Federal del Trabajo',
      module: 'laboral',
      provisions: 1266,
    });
    expect(JSON.stringify(overview)).not.toContain('diputados.gob.mx');
  });

  it('resolves downloads only from allowlisted Markdown files inside the corpus', () => {
    const corpusDirectory = `${process.cwd()}\\legal-runtime\\corpus`;

    expect(resolveCorpusFile(corpusDirectory, 'lft.md')).toMatch(/legal-runtime[\\/]corpus[\\/]lft\.md$/);
    expect(() => resolveCorpusFile(corpusDirectory, '..\\outside.md')).toThrow(/fuera del corpus/i);
    expect(() => resolveCorpusFile(corpusDirectory, 'lft.pdf')).toThrow(/no permitida/i);
  });

  it('finds law codes case-insensitively and reports availability', () => {
    expect(getInstalledCorpusLaw('lft')).toMatchObject({ code: 'LFT', name: 'Ley Federal del Trabajo' });
    expect(() => getInstalledCorpusLaw('NO-EXISTE')).toThrow(/no forma parte/i);
    expect(isLegalCorpusAvailable()).toBe(true);
  });

  it('reads full law content successfully', () => {
    const lft = readLegalCorpusLawContent('LFT');
    expect(lft.code).toBe('LFT');
    expect(lft.name).toBe('Ley Federal del Trabajo');
    expect(lft.content).toContain('Ley Federal del Trabajo');
    expect(lft.content).toContain('Artículo 1');
    expect(lft.provisions).toBeGreaterThan(100);
  });
});

