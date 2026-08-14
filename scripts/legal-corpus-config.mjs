import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CORPUS_DIR = path.resolve(__dirname, '../legal-runtime/corpus');
export const LANCEDB_DIR = path.resolve(__dirname, '../legal-runtime/lance_data');
export const MANIFEST_PATH = path.resolve(__dirname, '../reports/audits/legal_knowledge_manifest.json');
export const CORPUS_MANIFEST_PATH = path.resolve(__dirname, '../legal-runtime/corpus/corpus-manifest.json');
export const RETRIEVAL_PROBE_PATH = path.resolve(__dirname, '../reports/audits/legal_retrieval_probe.json');
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const CORPUS_SCHEMA_VERSION = 1;
export const CORPUS_VERSION = '2026.07-phase4-official-federal-core';

const FEDERAL_LAW_METADATA = {
  jurisdiction: 'MX-FED',
  sourceAuthority: 'Cámara de Diputados del H. Congreso de la Unión',
  sourceType: 'official_pdf',
  corpusProvenance: 'reconstructed_from_lancedb',
  verificationStatus: 'pending_official_reconciliation',
  effectiveFrom: null,
  effectiveTo: null,
  officialLastCheckedAt: null,
};

const SAT_RULE_METADATA = {
  jurisdiction: 'MX-FED',
  sourceAuthority: 'Servicio de Administración Tributaria',
  sourceType: 'official_pdf',
  corpusProvenance: 'reconstructed_from_lancedb',
  verificationStatus: 'pending_official_reconciliation',
  effectiveFrom: null,
  effectiveTo: null,
  officialLastCheckedAt: null,
};

const VERIFIED_FEDERAL_FISCAL_METADATA = {
  corpusProvenance: 'official_pdf_direct',
  verificationStatus: 'verified_against_official_source',
  officialLastCheckedAt: '2026-07-14',
};

const VERIFIED_DOCUMENTAL_METADATA = {
  corpusProvenance: 'official_pdf_direct',
  verificationStatus: 'verified_against_official_source',
  officialLastCheckedAt: '2026-08-12',
};

const VERIFIED_RGCE_METADATA = {
  corpusProvenance: 'official_sat_compilation_pdf',
  verificationStatus: 'verified_against_official_source',
  officialLastCheckedAt: '2026-08-12',
};

export const LAWS = [
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'CCom', name: 'Código de Comercio', module: 'mercantil', corpus: 'codigo_comercio.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CCom.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'LGSM', name: 'Ley General de Sociedades Mercantiles', module: 'mercantil', corpus: 'lgsm.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGSM.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'LGTOC', name: 'Ley General de Títulos y Operaciones de Crédito', module: 'mercantil', corpus: 'lgtoc.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LGTOC.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_DOCUMENTAL_METADATA, code: 'LFT', name: 'Ley Federal del Trabajo', module: 'laboral', corpus: 'lft.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_DOCUMENTAL_METADATA, code: 'LCE', name: 'Ley de Comercio Exterior', module: 'comercio_exterior', corpus: 'lce.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LCE.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_DOCUMENTAL_METADATA, code: 'RLCE', name: 'Reglamento de la Ley de Comercio Exterior', module: 'comercio_exterior', corpus: 'rlce.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LCE.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_DOCUMENTAL_METADATA, code: 'LA', name: 'Ley Aduanera', module: 'aduanal', corpus: 'ley_aduanera.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LAdua.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_DOCUMENTAL_METADATA, code: 'RLA', name: 'Reglamento de la Ley Aduanera', module: 'aduanal', corpus: 'rla.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LAdua.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_DOCUMENTAL_METADATA, code: 'LIGIE', name: 'Ley de los Impuestos Generales de Importación y de Exportación', module: 'aduanal', corpus: 'ligie.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIGIE_2022.pdf' },
  { ...SAT_RULE_METADATA, ...VERIFIED_RGCE_METADATA, code: 'RGCE', name: 'Reglas Generales de Comercio Exterior para 2026', module: 'aduanal', corpus: 'rgce_2026.md', url: 'https://www.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rgce/compiladas/1raRMRGCEpara2026.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'CFF', name: 'Código Fiscal de la Federación', module: 'fiscal', corpus: 'cff.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/CFF.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'LISR', name: 'Ley del Impuesto sobre la Renta', module: 'fiscal', corpus: 'lisr.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'RLISR', name: 'Reglamento de la Ley del Impuesto sobre la Renta', module: 'fiscal', corpus: 'rlisr.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LISR_060516.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'LIVA', name: 'Ley del Impuesto al Valor Agregado', module: 'fiscal', corpus: 'liva.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LIVA.pdf' },
  { ...FEDERAL_LAW_METADATA, ...VERIFIED_FEDERAL_FISCAL_METADATA, code: 'RLIVA', name: 'Reglamento de la Ley del Impuesto al Valor Agregado', module: 'fiscal', corpus: 'rliva.md', url: 'https://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LIVA_250914.pdf' },
  {
    ...SAT_RULE_METADATA,
    code: 'RMF',
    name: 'Resolución Miscelánea Fiscal para 2026',
    module: 'fiscal',
    corpus: 'rmf.md',
    url: 'https://wwwnp.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/RMF_2026-DOF-28122025.pdf',
    amendmentUrl: 'https://wwwnp.sat.gob.mx/minisitio/NormatividadRMFyRGCE/documentos2026/rmf/rmf/1aRM_RMF2026.pdf',
    corpusProvenance: 'official_base_with_published_amendment_overlay',
    verificationStatus: 'verified_against_official_source',
    effectiveFrom: '2026-07-10',
    officialLastCheckedAt: '2026-07-14',
  },
];
