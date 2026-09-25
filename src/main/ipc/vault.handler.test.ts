import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    getPath: () => process.cwd(),
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
}));

vi.mock('../lib/case-vault', () => ({
  createCase: vi.fn(),
  deleteAnalysis: vi.fn(),
  deleteAllCases: vi.fn(),
  deleteCase: vi.fn(),
  deleteDraft: vi.fn(),
  exportCase: vi.fn(),
  listCases: vi.fn(),
  purgeExpiredCases: vi.fn(),
  renameCase: vi.fn(),
  saveAnalysis: vi.fn(),
  saveCaseState: vi.fn(),
  saveDraft: vi.fn(),
}));

import {
  CreateCaseSchema,
  RenameCaseSchema,
  SaveAnalysisSchema,
  SaveDraftSchema,
  ExportPdfSchema,
  ExportDocxSchema,
} from './vault.handler';

describe('vault IPC input validation schemas', () => {
  it('strictly validates SaveAnalysisSchema and rejects non-record analysisData (preventing z.any regression)', () => {
    // Valid case
    const valid = SaveAnalysisSchema.parse({
      caseId: 'valid-case_123',
      analysisId: 'analysis-1',
      analysisData: { score: 95, summary: 'Aprobado' },
      expectedModule: 'mercantil',
    });
    expect(valid.caseId).toBe('valid-case_123');

    // Reject primitives instead of allowing any
    expect(() => SaveAnalysisSchema.parse({
      caseId: 'valid-case_123',
      analysisId: 'analysis-1',
      analysisData: 'not-an-object',
    })).toThrow();

    expect(() => SaveAnalysisSchema.parse({
      caseId: 'valid-case_123',
      analysisId: 'analysis-1',
      analysisData: 12345,
    })).toThrow();

    expect(() => SaveAnalysisSchema.parse({
      caseId: 'valid-case_123',
      analysisId: 'analysis-1',
      analysisData: null,
    })).toThrow();
  });

  it('strictly validates SaveDraftSchema and rejects primitive draftData', () => {
    const valid = SaveDraftSchema.parse({
      caseId: 'valid-case_123',
      draftId: 'draft-1',
      draftData: { text: 'Contrato...', clauses: [] },
      expectedModule: 'fiscal',
    });
    expect(valid.draftId).toBe('draft-1');

    expect(() => SaveDraftSchema.parse({
      caseId: 'valid-case_123',
      draftId: 'draft-1',
      draftData: false,
    })).toThrow();
  });

  it('enforces maximum payload size for ExportPdfSchema and ExportDocxSchema', () => {
    // Under 30MB base64
    expect(() => ExportPdfSchema.parse({
      base64: 'JVBERi0xLjQK...',
      defaultPath: 'report.pdf',
    })).not.toThrow();

    // Reject empty
    expect(() => ExportPdfSchema.parse({
      base64: '',
      defaultPath: 'report.pdf',
    })).toThrow();

    // Reject excessive size (> 30,000,000 chars)
    expect(() => ExportPdfSchema.parse({
      base64: 'A'.repeat(30_000_001),
      defaultPath: 'report.pdf',
    })).toThrow();

    expect(() => ExportDocxSchema.parse({
      base64: 'A'.repeat(30_000_001),
      defaultPath: 'report.docx',
    })).toThrow();
  });

  it('rejects invalid caseId with special characters or path traversal attempts', () => {
    expect(() => CreateCaseSchema.parse({
      caseId: '../../etc/passwd',
      name: 'Malicious case',
      module: 'mercantil',
    })).toThrow('Invalid case ID format');

    expect(() => RenameCaseSchema.parse({
      caseId: 'case;DROP TABLE cases;',
      name: 'SQL injection attempt',
    })).toThrow('Invalid case ID format');
  });
});
