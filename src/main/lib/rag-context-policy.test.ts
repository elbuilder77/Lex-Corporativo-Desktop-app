import { describe, expect, it } from 'vitest';
import { prepareLegalSourcesForEngine, type RAGMatch } from './rag';

function source(id: string, law: string, size = 5_000): RAGMatch {
  return {
    id,
    type: 'statute',
    title: law,
    subtitle: `Artículo ${id}`,
    content: 'x'.repeat(size),
    similarity: 0.9,
    law_code: law,
    article_number: `Artículo ${id}`,
    module: 'fiscal',
    verification_status: 'verified_against_official_source',
  };
}

describe('RAG context policy', () => {
  const matches = [
    source('1', 'CFF'), source('2', 'CFF'), source('3', 'LISR'),
    source('4', 'LIVA'), source('5', 'RMF'), source('6', 'RLISR'),
    source('7', 'RLIVA'), source('8', 'CFF'), source('9', 'RMF'),
  ];

  it('gives local inference a compact and diverse context', () => {
    const result = prepareLegalSourcesForEngine(matches, 'local');
    expect(result).toHaveLength(4);
    expect(result.map(item => item.law_code)).toEqual(['CFF', 'LISR', 'LIVA', 'RMF']);
    expect(result.every(item => item.content.length < 1_500)).toBe(true);
  });

  it('allows BYOK more sources and longer excerpts without changing authority', () => {
    const result = prepareLegalSourcesForEngine(matches, 'byok');
    expect(result).toHaveLength(8);
    expect(result[0].id).toBe('1');
    expect(result.every(item => item.content.length < 3_300)).toBe(true);
    expect(result.every(item => item.verification_status === 'verified_against_official_source')).toBe(true);
  });
});
