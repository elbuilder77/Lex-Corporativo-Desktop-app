import { describe, expect, it } from 'vitest';
import {
  ADUANAL_DRAFTING_TEMPLATES,
  COMERCIO_EXTERIOR_DRAFTING_TEMPLATES,
  FISCAL_DRAFTING_TEMPLATES,
  LABORAL_DRAFTING_TEMPLATES,
  LEGAL_ENGINEERING_TEMPLATES,
  MERCANTIL_DRAFTING_TEMPLATES,
  applyDraftingTemplateToPrompt,
  buildDraftingPromptFromTemplate,
  type DraftingTemplate,
} from './constants';

function expectTemplateCatalogIntegrity(catalog: DraftingTemplate[], expectedPrefix?: string) {
  const ids = new Set<string>();

  for (const template of catalog) {
    expect(template.id).toMatch(/^[a-z_]+-[a-z0-9-]+$/);
    if (expectedPrefix) {
      expect(template.id.startsWith(`${expectedPrefix}-`)).toBe(true);
    }
    expect(template.title.trim()).toBeTruthy();
    expect(template.description.trim()).toBeTruthy();
    expect(template.prompt.trim()).toBeTruthy();
    expect(template.output.trim()).toBeTruthy();
    expect(template.requiredFields.length).toBeGreaterThan(0);
    expect(ids.has(template.id)).toBe(false);
    ids.add(template.id);
  }
}

describe('drafting templates', () => {
  it('keeps all 5 legal area catalogs complete, unique, and verified', () => {
    expect(MERCANTIL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(12);
    expect(LABORAL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    expect(COMERCIO_EXTERIOR_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    expect(ADUANAL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(8);
    expect(FISCAL_DRAFTING_TEMPLATES.length).toBeGreaterThanOrEqual(8);

    expectTemplateCatalogIntegrity(MERCANTIL_DRAFTING_TEMPLATES, 'mercantil');
    expectTemplateCatalogIntegrity(LABORAL_DRAFTING_TEMPLATES, 'laboral');
    expectTemplateCatalogIntegrity(COMERCIO_EXTERIOR_DRAFTING_TEMPLATES, 'comercio_exterior');
    expectTemplateCatalogIntegrity(ADUANAL_DRAFTING_TEMPLATES, 'aduanal');
    expectTemplateCatalogIntegrity(FISCAL_DRAFTING_TEMPLATES, 'fiscal');

    expect(LEGAL_ENGINEERING_TEMPLATES.mercantil).toBe(MERCANTIL_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.laboral).toBe(LABORAL_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.comercio_exterior).toBe(COMERCIO_EXTERIOR_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.aduanal).toBe(ADUANAL_DRAFTING_TEMPLATES);
    expect(LEGAL_ENGINEERING_TEMPLATES.fiscal).toBe(FISCAL_DRAFTING_TEMPLATES);
  });

  it('builds a visible prompt scaffold with required fields', () => {
    const template = MERCANTIL_DRAFTING_TEMPLATES.find((item) => item.id === 'mercantil-pagare');
    expect(template).toBeDefined();

    const scaffold = buildDraftingPromptFromTemplate(template!);

    expect(scaffold).toContain('Plantilla predefinida: Pagaré Mercantil');
    expect(scaffold).toContain('Requisitos mínimos:');
    for (const field of template!.requiredFields) {
      expect(scaffold).toContain(`- ${field}`);
    }
  });

  it('replaces a previous template scaffold without dropping user notes', () => {
    const firstTemplate = FISCAL_DRAFTING_TEMPLATES[0];
    const nextTemplate = FISCAL_DRAFTING_TEMPLATES[1];
    const firstPrompt = applyDraftingTemplateToPrompt(firstTemplate, '', null);
    const promptWithNotes = `${firstPrompt}\n\nNotas del portafolio:\nOperacion con proveedor extranjero.`;

    const nextPrompt = applyDraftingTemplateToPrompt(nextTemplate, promptWithNotes, firstTemplate);

    expect(nextPrompt).toContain(`Plantilla predefinida: ${nextTemplate.title}`);
    expect(nextPrompt).not.toContain(`Plantilla predefinida: ${firstTemplate.title}`);
    expect(nextPrompt).toContain('Operacion con proveedor extranjero.');
    expect(nextPrompt.match(/Notas del portafolio:/g)).toHaveLength(1);
  });
});
