import { describe, expect, it } from 'vitest';

import {
  getNoRagWarning,
  getSystemInstruction,
  isLawAllowedForModule,
  normalizeLawCode
} from './prompts';

describe('legal module prompt isolation', () => {
  it('keeps mercantile consultations scoped to mercantile laws', () => {
    expect(isLawAllowedForModule('LGTOC', 'mercantil')).toBe(true);
    expect(isLawAllowedForModule('Código de Comercio', 'mercantil')).toBe(true);
    expect(isLawAllowedForModule('CFF', 'mercantil')).toBe(false);
    expect(isLawAllowedForModule('Resolución Miscelánea Fiscal', 'mercantil')).toBe(false);
  });

  it('keeps fiscal consultations scoped to fiscal laws', () => {
    expect(isLawAllowedForModule('CFF', 'fiscal')).toBe(true);
    expect(isLawAllowedForModule('RMF', 'fiscal')).toBe(true);
    expect(isLawAllowedForModule('LGTOC', 'fiscal')).toBe(false);
    expect(isLawAllowedForModule('Código de Comercio', 'fiscal')).toBe(false);
  });

  it('keeps mercantile prompts free of fiscal negative-trigger tokens', () => {
    const mercantilePrompt = `${getSystemInstruction('mercantil')}\n${getNoRagWarning('mercantil')}`;

    expect(mercantilePrompt).toContain('LGTOC');
    expect(mercantilePrompt).toContain('Código de Comercio');
    expect(mercantilePrompt).toContain('LGSM');
    expect(mercantilePrompt).not.toMatch(/\bCFF\b|LISR|LIVA|RMF|69-B/);
  });

  it('normalizes common law titles to stable codes', () => {
    expect(normalizeLawCode('Ley General de Títulos y Operaciones de Crédito')).toBe('LGTOC');
    expect(normalizeLawCode('Código Fiscal de la Federación')).toBe('CFF');
  });
});
