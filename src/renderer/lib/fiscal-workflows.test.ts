import { describe, expect, it } from 'vitest';
import {
  FISCAL_ANALYSIS_WORKFLOWS,
  FISCAL_WORKSPACE_TABS,
} from './fiscal-workflows';

describe('desktop fiscal workflows', () => {
  it('keeps each fiscal analysis workflow local, focused and actionable', () => {
    for (const workflow of Object.values(FISCAL_ANALYSIS_WORKFLOWS)) {
      expect(workflow.title.trim()).toBeTruthy();
      expect(workflow.initialInstruction.length).toBeGreaterThan(80);
      expect(workflow.expectedOutputs).toHaveLength(3);
      expect(workflow.initialInstruction).not.toMatch(/LGSM|LGTOC|Código de Comercio/);
    }
  });

  it('exposes fiscal analysis and regulations without duplicating document generation', () => {
    expect(FISCAL_WORKSPACE_TABS).toEqual([
      'analysis',
      'fiscal-materiality',
      'fiscal-deductibility',
      'fiscal-regulations',
    ]);
    expect(new Set(FISCAL_WORKSPACE_TABS).size).toBe(FISCAL_WORKSPACE_TABS.length);
  });
});
