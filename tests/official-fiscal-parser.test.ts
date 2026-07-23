import { describe, expect, it } from 'vitest';
import {
  extractLawArticles,
  extractRmfAmendmentSummary,
  consolidateRmfProvisions,
  extractRmfAmendmentProvisions,
  extractRmfRules,
  normalizeProvisionId,
  validateProvisions,
} from '../scripts/official-fiscal-parser.mjs';

describe('official fiscal corpus parser', () => {
  it('normalizes ordinal and suffixed article identities', () => {
    expect(normalizeProvisionId('1o.-A', 'article')).toBe('1-A');
    expect(normalizeProvisionId('69-B', 'article')).toBe('69-B');
    expect(normalizeProvisionId('111 BIS', 'article')).toBe('111 Bis');
  });

  it('extracts only the main law body and preserves source pages', () => {
    const result = extractLawArticles([
      { num: 1, text: 'LEY DE PRUEBA\nArtículo 1o.- Texto vigente del primer artículo con contenido suficiente.' },
      { num: 2, text: '2 de 3\nArtículo 1o.-A.- Texto vigente del artículo adicional con contenido suficiente.' },
      { num: 3, text: 'TRANSITORIOS\nPRIMERO.- Este decreto entra en vigor mañana.\nArtículo 1o.- Texto histórico.' },
    ], { repeatedHeader: 'LEY DE PRUEBA' });

    expect(result.provisions.map(item => item.id)).toEqual(['1', '1-A']);
    expect(result.provisions[1].sourcePages).toEqual([2]);
    expect(result.transitoryPage).toBe(3);
  });

  it('stops a law body at a transitory heading that includes a colon', () => {
    const result = extractLawArticles([
      { num: 1, text: 'Artículo 1.- Texto normativo vigente suficientemente largo para la prueba.' },
      { num: 2, text: 'TRANSITORIOS:\nPRIMERO.- Entrada en vigor.\nArtículo 1.- Texto histórico que no debe indexarse.' },
    ]);

    expect(result.provisions).toHaveLength(1);
    expect(result.transitoryPage).toBe(2);
  });

  it('extracts RMF rules after the contents and before transitories', () => {
    const result = extractRmfRules([
      { num: 1, text: 'Contenido\nCapítulo 1.1. Disposiciones' },
      { num: 9, text: 'Título 1\n1.1. Presentación de documentos ante el SAT con el procedimiento aplicable.' },
      { num: 10, text: '1.2. Procedimiento distinto con texto normativo suficientemente extenso.' },
      { num: 11, text: 'TRANSITORIOS\nPrimero. Entrada en vigor.' },
    ]);

    expect(result.provisions.map(item => item.id)).toEqual(['1.1', '1.2']);
    expect(result.firstProvisionPage).toBe(9);
    expect(result.transitoryPage).toBe(11);
  });

  it('blocks conflicting duplicate identities', () => {
    const provisions = [
      { id: '1', content: 'A', contentSha256: 'one' },
      { id: '1o.', content: 'B', contentSha256: 'two' },
    ];
    const validation = validateProvisions(provisions, { minimumEntries: 1 });
    expect(validation.status).toBe('fail');
    expect(validation.duplicates).toHaveLength(1);
    expect(validation.duplicates[0].conflicting).toBe(true);
  });

  it('classifies the RMF modification directive without applying it silently', () => {
    const result = extractRmfAmendmentSummary([{
      num: 1,
      text: 'PRIMERO. Se reforman las reglas 2.1.6. y 3.16.11.; se adicionan las reglas 3.5.23. y 11.7.3.; y se deroga la regla 2.12.4. para quedar de la siguiente manera:',
    }]);

    expect(result.status).toBe('parsed_directive_requires_patch_application');
    expect(result.operations.reformed).toEqual(['2.1.6', '3.16.11']);
    expect(result.operations.added).toEqual(['3.5.23', '11.7.3']);
    expect(result.operations.repealed).toEqual(['2.12.4']);
  });

  it('requires all 38 official RMF amendment blocks before consolidation', () => {
    const result = extractRmfAmendmentProvisions([{
      num: 1,
      text: '2.12.4. Se deroga.\n3.5.23. Texto de la regla adicionada suficientemente extenso.',
    }]);

    expect(result.status).toBe('fail');
    expect(result.expectedProvisionIds).toHaveLength(38);
    expect(result.missingProvisionIds).toContain('11.18.2');
  });

  it('preserves the base text outside the exact scope of a partial reform', () => {
    const base = [{
      kind: 'rule', id: '2.1.6', label: 'Regla 2.1.6', content: 'Texto base íntegro.',
      contentSha256: 'base-hash', sourcePages: [10],
    }];
    const amendment = [{
      kind: 'rule', id: '2.1.6', label: 'Regla 2.1.6', content: '… III. Nuevo periodo vacacional.',
      contentSha256: 'amendment-hash', sourcePages: [1],
    }];
    const result = consolidateRmfProvisions(base, amendment, {
      publishedAt: '2026-07-09', effectiveFrom: '2026-07-10', url: 'https://example.test/mod.pdf', sourceSha256: 'source-hash',
    });

    expect(result.status).toBe('fail');
    expect(result.provisions[0].content).toContain('Texto base íntegro.');
    expect(result.provisions[0].content).toContain('No se deben completar los puntos suspensivos');
  });
});
