import { describe, expect, it } from 'vitest';
import { expandLegalQuery } from './legal-query-expansion';

describe('legal short-query expansion', () => {
  it('normalizes a household-worker query and adds the controlled benefits vocabulary', () => {
    const result = expandLegalQuery('Prestaciones trabajadadores hogar', 'laboral');
    expect(result.canonical).toBe('prestaciones trabajadores hogar');
    expect(result.retrieval).toContain('personas trabajadoras del hogar');
    expect(result.retrieval).toContain('aguinaldo');
    expect(result.retrieval).toContain('seguridad social');
  });

  it('does not invent article numbers or unrelated laws', () => {
    const result = expandLegalQuery('prestaciones trabajadores hogar', 'laboral');
    expect(result.retrieval).not.toMatch(/\bart(?:iculo)?\s+\d/i);
    expect(result.retrieval).not.toContain('LFT');
  });

  it('keeps unknown queries unchanged after normalization', () => {
    const result = expandLegalQuery('Obligaciones especiales', 'mercantil');
    expect(result.addedTerms).toEqual([]);
    expect(result.retrieval).toBe('obligaciones especiales');
  });
});
