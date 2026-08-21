import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  filters: [] as string[],
  userDataPath: `${process.env.TEMP || process.cwd()}/lex-corp-vitest-userdata`,
  legalRows: [
    {
      id: 'lgtoc-170',
      title: 'Ley General de Títulos y Operaciones de Crédito',
      law_code: 'LGTOC',
      article: 'Artículo 170',
      content: 'El pagaré debe contener la mención de ser pagaré inserta en el texto del documento.',
      _distance: 0.1,
      module: 'mercantil',
    },
    {
      id: 'cff-69b',
      title: 'Código Fiscal de la Federación',
      law_code: 'CFF',
      article: 'Artículo 69-B',
      content: 'Procedimiento fiscal sobre CFDI, pagos y materialidad de operaciones inexistentes.',
      _distance: 0.05,
      module: 'fiscal',
    },
    {
      id: 'lft-334-bis',
      title: 'Ley Federal del Trabajo',
      law_code: 'LFT',
      article: 'Artículo 334 Bis',
      content: 'Las personas trabajadoras del hogar contarán con prestaciones: vacaciones, prima vacacional, aguinaldo y acceso obligatorio a la seguridad social.',
      _distance: 0.15,
      module: 'laboral',
    },
    {
      id: 'lft-generic',
      title: 'Ley Federal del Trabajo',
      law_code: 'LFT',
      article: 'Artículo 10',
      content: 'Patrón es la persona física o moral que utiliza los servicios de uno o varios trabajadores.',
      _distance: 0.05,
      module: 'laboral',
    },
  ],
  userRows: [
    {
      id: 'doc-1',
      requestId: 'analysis-1',
      fileName: 'contrato-mercantil.pdf',
      content: 'La cláusula penal establece una pena convencional por incumplimiento del suministro.',
      module: 'mercantil',
      contentHash: 'hash-1',
      chunkIndex: 0,
      pageNumber: 2,
      _distance: 0.2,
    },
    {
      id: 'doc-2',
      requestId: 'analysis-2',
      fileName: 'otro-expediente.pdf',
      content: 'Este fragmento pertenece a otro análisis y no debe recuperarse.',
      module: 'mercantil',
      contentHash: 'hash-2',
      chunkIndex: 0,
      pageNumber: 1,
      _distance: 0.01,
    },
    {
      id: 'doc-3',
      requestId: 'analysis-fiscal',
      fileName: 'materialidad.pdf',
      content: 'El soporte incluye CFDI, pagos y entregables de servicios especializados.',
      module: 'fiscal',
      contentHash: 'hash-3',
      chunkIndex: 0,
      pageNumber: 4,
      _distance: 0.02,
    },
  ],
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => mockState.userDataPath,
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
}));

vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(async () => async () => ({ data: new Float32Array([0.1, 0.2, 0.3]) })),
  env: {
    allowRemoteModels: true,
    localModelPath: '',
    cacheDir: '',
  },
}));

function createQuery(rowsFactory: (filterValue?: string) => any[], label: string) {
  let currentFilter: string | undefined;

  return {
    filter(value: string) {
      currentFilter = value;
      mockState.filters.push(`${label}:${value}`);
      return this;
    },
    where(value: string) {
      return this.filter(value);
    },
    limit() {
      return this;
    },
    async toArray() {
      return rowsFactory(currentFilter);
    },
  };
}

function extractFilterValues(filterValue: string | undefined, field: string): string[] {
  return [...(filterValue || '').matchAll(new RegExp(`"?${field}"? = '([^']+)'`, 'g'))].map(match => match[1]);
}

function filterLegalRows(filterValue?: string) {
  const lawCodes = extractFilterValues(filterValue, 'law_code');
  return mockState.legalRows.filter(row => lawCodes.length === 0 || lawCodes.includes(row.law_code));
}

vi.mock('@lancedb/lancedb', () => {
  const legalTable = {
    vectorSearch: () => createQuery(filterLegalRows, 'legal-search'),
    query: () => createQuery(filterLegalRows, 'legal-filter'),
  };

  const userTable = {
    vectorSearch: () => createQuery((filterValue?: string) => (
      mockState.userRows.filter(row => (
        filterValue?.includes(`"requestId" = '${row.requestId}'`)
        && filterValue?.includes(`module = '${row.module}'`)
      ))
    ), 'user-search'),
    query: () => createQuery(() => mockState.userRows, 'user-filter'),
    async delete() {},
    async add() {
      return 1;
    },
    async createIndex() {},
  };

  return {
    Index: { btree: () => ({ type: 'btree' }) },
    connect: vi.fn(async () => ({
      tableNames: async () => ['user_documents'],
      openTable: async (name: string) => (name === 'legal_knowledge' ? legalTable : userTable),
      createTable: async () => userTable,
      dropTable: async () => undefined,
    })),
  };
});

import { getAnalysisContext, getLegalKnowledgeRuntimePath, searchLegalArticles } from './rag';

describe('analysis double-lane RAG context', () => {
  beforeEach(() => {
    mockState.filters = [];
    delete process.env.LEX_ENGINE_LANCE_PATH;
    mkdirSync(join(mockState.userDataPath, 'lance_data', 'user_documents.lance'), { recursive: true });
  });

  it('uses LEX_ENGINE_LANCE_PATH as the authoritative legal vector path when within allowed roots', () => {
    const allowedPath = join(mockState.userDataPath, 'lance_data');
    process.env.LEX_ENGINE_LANCE_PATH = allowedPath;
    expect(getLegalKnowledgeRuntimePath()).toBe(allowedPath);
  });

  it('ranks the household-worker benefits provision from a three-word all-corpus search', async () => {
    const result = await searchLegalArticles('prestaciones trabajadores hogar', 'todos', 8);
    expect(result.queryExpansion.addedTerms).toContain('personas trabajadoras del hogar');
    expect(result.matches[0]?.id).toBe('lft-334-bis');
    expect(result.matches[0]?.retrieval_type).toBe('hybrid');
  });

  it('recovers only current-request document chunks and module-allowed laws', async () => {
    const result = await getAnalysisContext('auditar pagaré y cláusula penal', 'mercantil', 'analysis-1');

    expect(result.context).toContain('### DOCUMENTOS ANALIZADOS (Evidencia del Usuario)');
    expect(result.context).toContain('contrato-mercantil.pdf página 2');
    expect(result.context).toContain('cláusula penal');
    expect(result.context).not.toContain('otro análisis');

    expect(result.context).toContain('### FUNDAMENTO LEGAL VERIFICADO (Leyes del Ecosistema)');
    expect(result.context).toContain('No se encontraron artículos específicos');
    expect(result.context).not.toContain('LGTOC Artículo 170');
    expect(result.context).not.toContain('CFF');

    expect(mockState.filters.some(filter => (
      filter.startsWith('legal-search:')
      && filter.includes("law_code = 'CCom'")
      && filter.includes("law_code = 'LGTOC'")
      && !filter.includes("law_code = 'CFF'")
    ))).toBe(true);
    expect(mockState.filters).toContain('user-search:"requestId" = \'analysis-1\' AND module = \'mercantil\'');
  });

  it('keeps fiscal analysis on fiscal documents and fiscal laws only', async () => {
    const result = await getAnalysisContext('auditar CFDI materialidad pagos', 'fiscal', 'analysis-fiscal');

    expect(result.context).toContain('materialidad.pdf página 4');
    expect(result.context).toContain('CFDI');
    expect(result.context).not.toContain('contrato-mercantil.pdf');
    expect(result.context).not.toContain('pagaré');

    expect(result.context).toContain('CFF Artículo 69-B');
    expect(result.context).not.toContain('LGTOC');

    expect(mockState.filters.some(filter => (
      filter.startsWith('legal-search:')
      && filter.includes("law_code = 'CFF'")
      && filter.includes("law_code = 'RMF'")
      && !filter.includes("law_code = 'LGTOC'")
    ))).toBe(true);
    expect(mockState.filters).toContain('user-search:"requestId" = \'analysis-fiscal\' AND module = \'fiscal\'');
  });
});
