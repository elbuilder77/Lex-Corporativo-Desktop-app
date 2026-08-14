import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

import { parseDraftPayload } from './draft.handler';

describe('draft payload validation', () => {
  it('accepts drafting without a predefined template', () => {
    const payload = parseDraftPayload({
      requirements: 'Redactar contrato de suministro.',
      ecosystem: 'mercantil',
      workflowModule: 'drafting',
    });

    expect(payload.module).toBe('mercantil');
    expect(payload.ecosystem).toBe('mercantil');
    expect(payload.workflowModule).toBe('drafting');
    expect(payload.promptProfile).toBe('mercantil_drafting');
    expect(payload.template).toBeUndefined();
  });

  it('accepts a template that belongs to the active ecosystem', () => {
    const payload = parseDraftPayload({
      requirements: 'Preparar escrito de aclaracion al SAT.',
      ecosystem: 'fiscal',
      promptProfile: 'fiscal_drafting',
      template: {
        id: 'fiscal-escrito-sat',
        title: 'Escrito SAT',
        prompt: 'Escrito libre al SAT.',
        requiredFields: ['RFC', 'Folio'],
        output: 'Escrito libre.',
      },
    });

    expect(payload.template?.id).toBe('fiscal-escrito-sat');
    expect(payload.templateId).toBe('fiscal-escrito-sat');
  });

  it('accepts labor drafting when the template belongs to the labor area', () => {
    const payload = parseDraftPayload({
      requirements: 'Preparar contrato individual por tiempo indeterminado.',
      ecosystem: 'laboral',
      template: {
        id: 'laboral-contrato-indeterminado',
        title: 'Contrato por tiempo indeterminado',
        prompt: 'Contrato individual de trabajo.',
      },
    });

    expect(payload.ecosystem).toBe('laboral');
    expect(payload.promptProfile).toBe('laboral_drafting');
  });

  it('ignores renderer attempts to select an execution mode', () => {
    const payload = parseDraftPayload({
      requirements: 'Preparar un contrato complejo para revisión profesional.',
      ecosystem: 'mercantil',
      executionMode: 'byok',
    });

    expect(payload).not.toHaveProperty('executionMode');
    expect(payload).not.toHaveProperty('cloudConsent');
  });

  it('accepts a local reference file as a user-provided template', () => {
    const payload = parseDraftPayload({
      requirements: 'Completar el machote sin cambiar su estructura.',
      ecosystem: 'mercantil',
      referenceFile: {
        name: 'contrato-mercantil-base.txt',
        mimeType: 'text/plain',
        base64: Buffer.from('CONTRATO BASE').toString('base64'),
      },
    });

    expect(payload.referenceFile?.name).toBe('contrato-mercantil-base.txt');
  });

  it('rejects a template from another legal area', () => {
    expect(() => parseDraftPayload({
      requirements: 'Usar plantilla fiscal en flujo mercantil.',
      ecosystem: 'mercantil',
      template: {
        id: 'fiscal-escrito-sat',
        title: 'Escrito SAT',
        prompt: 'Escrito libre al SAT.',
      },
    })).toThrow('no pertenece a la materia mercantil');
  });

  it('rejects a prompt profile from another legal area', () => {
    expect(() => parseDraftPayload({
      requirements: 'Preparar contrato mercantil.',
      ecosystem: 'mercantil',
      promptProfile: 'fiscal_drafting',
    })).toThrow('no pertenece a la materia mercantil');
  });

  it('accepts a source analysis id to link drafting to a prior analysis', () => {
    const payload = parseDraftPayload({
      requirements: 'Redactar contrato de arrendamiento mercantil.',
      ecosystem: 'mercantil',
      sourceAnalysisId: 'analysis-123',
    });

    expect(payload.sourceAnalysisId).toBe('analysis-123');
    expect(payload.ecosystem).toBe('mercantil');
  });

  it('rejects mismatched templateId and template payload', () => {
    expect(() => parseDraftPayload({
      requirements: 'Preparar escrito SAT.',
      ecosystem: 'fiscal',
      templateId: 'fiscal-dictamen-materialidad',
      template: {
        id: 'fiscal-escrito-sat',
        title: 'Escrito SAT',
        prompt: 'Escrito libre al SAT.',
      },
    })).toThrow('templateId no coincide');
  });
});
