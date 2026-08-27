import { app } from 'electron';
import { existsSync, readFileSync } from 'fs';
import { extname, isAbsolute, relative, resolve } from 'path';
import { z } from 'zod';

const LegalCorpusModuleSchema = z.enum([
  'mercantil',
  'laboral',
  'comercio_exterior',
  'aduanal',
  'fiscal',
]);

const CorpusManifestSchema = z.object({
  corpusVersion: z.string(),
  summary: z.object({
    configuredLaws: z.number().int().nonnegative(),
    corpusEntries: z.number().int().nonnegative(),
  }),
  laws: z.array(z.object({
    code: z.string().trim().min(1).max(24),
    name: z.string().trim().min(1).max(240),
    module: LegalCorpusModuleSchema,
    corpusFile: z.string().trim().min(1).max(160),
    file: z.object({
      exists: z.boolean(),
      bytes: z.number().int().nonnegative(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    }),
    structure: z.object({
      entries: z.number().int().nonnegative(),
    }),
  })),
});

export type LegalCorpusModule = z.infer<typeof LegalCorpusModuleSchema>;

export interface LegalCorpusLaw {
  code: string;
  name: string;
  module: LegalCorpusModule;
  provisions: number;
  bytes: number;
  sha256: string;
}

export interface LegalCorpusOverview {
  corpusVersion: string;
  lawsCount: number;
  provisionsCount: number;
  laws: LegalCorpusLaw[];
}

interface InstalledCorpusLaw extends LegalCorpusLaw {
  corpusFile: string;
  filePath: string;
}

function getCorpusDirectory(): string {
  return app.isPackaged
    ? resolve(process.resourcesPath, 'legal-runtime', 'corpus')
    : resolve(app.getAppPath(), 'legal-runtime', 'corpus');
}

function getManifestPath(): string {
  return app.isPackaged
    ? resolve(process.resourcesPath, 'legal-runtime', 'corpus-manifest.json')
    : resolve(getCorpusDirectory(), 'corpus-manifest.json');
}

export function resolveCorpusFile(corpusDirectory: string, corpusFile: string): string {
  if (isAbsolute(corpusFile) || extname(corpusFile).toLowerCase() !== '.md') {
    throw new Error('El manifiesto contiene una ruta de corpus no permitida.');
  }

  const resolvedDirectory = resolve(corpusDirectory);
  const filePath = resolve(resolvedDirectory, corpusFile);
  const relativePath = relative(resolvedDirectory, filePath);
  if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('El archivo solicitado está fuera del corpus instalado.');
  }

  return filePath;
}

function readInstalledCorpus(): {
  overview: LegalCorpusOverview;
  installedLaws: InstalledCorpusLaw[];
} {
  const manifestPath = getManifestPath();
  if (!existsSync(manifestPath)) {
    throw new Error('No se encontró el manifiesto del corpus normativo instalado.');
  }

  const manifest = CorpusManifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
  const corpusDirectory = getCorpusDirectory();
  const installedLaws = manifest.laws.map((law) => {
    const filePath = resolveCorpusFile(corpusDirectory, law.corpusFile);
    if (!law.file.exists || !existsSync(filePath)) {
      throw new Error(`No se encontró el texto instalado de ${law.code}.`);
    }

    return {
      code: law.code,
      name: law.name,
      module: law.module,
      provisions: law.structure.entries,
      bytes: law.file.bytes,
      sha256: law.file.sha256,
      corpusFile: law.corpusFile,
      filePath,
    };
  });

  return {
    overview: {
      corpusVersion: manifest.corpusVersion,
      lawsCount: manifest.summary.configuredLaws,
      provisionsCount: manifest.summary.corpusEntries,
      laws: installedLaws.map(({ corpusFile: _corpusFile, filePath: _filePath, ...law }) => law),
    },
    installedLaws,
  };
}

export function getLegalCorpusOverview(): LegalCorpusOverview {
  return readInstalledCorpus().overview;
}

export function getInstalledCorpusLaw(code: string): InstalledCorpusLaw {
  const normalizedCode = code.trim().toLocaleLowerCase('es-MX');
  const law = readInstalledCorpus().installedLaws.find(
    (candidate) => candidate.code.toLocaleLowerCase('es-MX') === normalizedCode,
  );
  if (!law) throw new Error('El ordenamiento solicitado no forma parte del corpus instalado.');
  return law;
}

export function readLegalCorpusLawContent(code: string): {
  code: string;
  name: string;
  module: LegalCorpusModule;
  content: string;
  provisions: number;
} {
  const law = getInstalledCorpusLaw(code);
  const content = readFileSync(law.filePath, 'utf8');
  return {
    code: law.code,
    name: law.name,
    module: law.module,
    content,
    provisions: law.provisions,
  };
}

export function isLegalCorpusAvailable(): boolean {
  try {
    const overview = getLegalCorpusOverview();
    return overview.laws.length === overview.lawsCount && overview.lawsCount > 0;
  } catch {
    return false;
  }
}

