import { mkdirSync } from 'fs';
import { join } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ragMockState = vi.hoisted(() => ({
  filters: [] as string[],
  userDataPath: `${process.env.TEMP || process.cwd()}/lex-corp-rag-tests`,
  legalRows: [
    {
      id: 'cff-69b',
      title: 'Código Fiscal de la Federación',
      law_code: 'CFF',
      article: 'Artículo 69-B',
      content: 'Procedimiento fiscal sobre CFDI, operaciones inexistentes y materialidad.',
      _distance: 0.1,
      module: 'fiscal',
    },
    {
      id: 'lgtoc-170',
      title: 'Ley General de Títulos y Operaciones de Crédito',
      law_code: 'LGTOC',
      article: 'Artículo 170',
      content: 'El pagaré debe contener la mención de ser pagaré inserta en el texto.',
      _distance: 0.1,
      module: 'mercantil',
    },
  ],
  userRows: [
    {
      id: 'doc-fiscal',
      requestId: 'req-fiscal',
      fileName: 'expediente-fiscal.pdf',
      content: 'El CFDI y la materialidad documental se soportan con entregables y evidencia de pago.',
      module: 'fiscal',
      contentHash: 'hash-fiscal',
      chunkIndex: 0,
      pageNumber: 4,
      _distance: 0.2,
    },
    {
      id: 'doc-mercantil',
      requestId: 'req-mercantil',
      fileName: 'contrato-mercantil.pdf',
      content: 'El pagaré contiene aval, vencimiento y obligación de pago incondicional.',
      module: 'mercantil',
      contentHash: 'hash-mercantil',
      chunkIndex: 1,
      pageNumber: 2,
      _distance: 0.2,
    },
  ],
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => ragMockState.userDataPath,
    getAppPath: () => process.cwd(),
    isPackaged: false,
  },
}));

vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(async () => async () => ({ data: new Float32Array([0.11, 0.22, 0.33]) })),
  env: {
    allowRemoteModels: true,
    localModelPath: '',
    cacheDir: '',
  },
}));

function extractFilterValue(filterValue: string | undefined, field: string): string | undefined {
  const match = filterValue?.match(new RegExp(`${field} = '([^']+)'`));
  return match?.[1];
}

function filterRows(rows: any[], filterValue?: string): any[] {
  const module = extractFilterValue(filterValue, 'module');
  const requestId = extractFilterValue(filterValue, 'requestId');

  return rows.filter(row => (
    (!module || row.module === module)
    && (!requestId || row.requestId === requestId)
  ));
}

function createQuery(label: string, rows: any[]) {
  let filterValue: string | undefined;

  return {
    filter(value: string) {
      filterValue = value;
      ragMockState.filters.push(`${label}:${value}`);
      return this;
    },
    where(value: string) {
      return this.filter(value);
    },
    limit() {
      return this;
    },
    async execute() {
      return filterRows(rows, filterValue);
    },
  };
}

vi.mock('vectordb', () => {
  const legalTable = {
    search: () => createQuery('legal-search', ragMockState.legalRows),
    filter: (value: string) => createQuery('legal-filter', ragMockState.legalRows).filter(value),
  };

  const userTable = {
    search: () => createQuery('user-search', ragMockState.userRows),
    async delete() {},
    async add() {
      return 1;
    },
    async createScalarIndex() {},
  };

  return {
    connect: vi.fn(async () => ({
      tableNames: async () => ['user_documents'],
      openTable: async (name: string) => (name === 'legal_knowledge' ? legalTable : userTable),
      createTable: async () => userTable,
      dropTable: async () => undefined,
    })),
  };
});

import { getAnalysisContext } from '../src/main/lib/rag';

describe('RAG doble carril para análisis', () => {
  beforeEach(() => {
    ragMockState.filters = [];
    mkdirSync(join(ragMockState.userDataPath, 'lance_data', 'user_documents.lance'), { recursive: true });
  });

  it('estructura el contexto Markdown y aísla el namespace fiscal', async () => {
    const result = await getAnalysisContext('auditar materialidad y CFDI', 'fiscal', 'req-fiscal');

    expect(result.context).toContain('### DOCUMENTOS ANALIZADOS');
    expect(result.context).toContain('### FUNDAMENTO LEGAL VERIFICADO');
    expect(result.context).toContain('expediente-fiscal.pdf página 4');
    expect(result.context).toContain('CFF Artículo 69-B');
    expect(result.context).not.toContain('LGTOC');
    expect(result.context).not.toContain('contrato-mercantil.pdf');
    expect(ragMockState.filters).toContain("legal-search:module = 'fiscal'");
    expect(ragMockState.filters).toContain('user-search:"requestId" = \'req-fiscal\' AND module = \'fiscal\'');
    expect(ragMockState.filters.some(filter => filter.includes("module = 'mercantil'"))).toBe(false);
  });

  it('estructura el contexto Markdown y aísla el namespace mercantil', async () => {
    const result = await getAnalysisContext('auditar pagaré y aval', 'mercantil', 'req-mercantil');

    expect(result.context).toContain('### DOCUMENTOS ANALIZADOS');
    expect(result.context).toContain('### FUNDAMENTO LEGAL VERIFICADO');
    expect(result.context).toContain('contrato-mercantil.pdf página 2');
    expect(result.context).toContain('No se encontraron artículos específicos');
    expect(result.context).not.toContain('LGTOC Artículo 170');
    expect(result.context).not.toContain('CFF');
    expect(result.context).not.toContain('expediente-fiscal.pdf');
    expect(ragMockState.filters).toContain("legal-search:module = 'mercantil'");
    expect(ragMockState.filters).toContain('user-search:"requestId" = \'req-mercantil\' AND module = \'mercantil\'');
    expect(ragMockState.filters.some(filter => filter.includes("module = 'fiscal'"))).toBe(false);
  });
});
