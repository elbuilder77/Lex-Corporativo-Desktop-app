import type {
  DocumentAnalysisResult,
  FiscalCfdiRecord,
  FiscalEvidenceRecord,
} from '../types';

const unique = (items: Array<string | undefined>) => [...new Set(items.filter((item): item is string => Boolean(item?.trim())).map((item) => item.trim()))];

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-');

const evidenceId = (_status: FiscalEvidenceRecord['status'], title: string) => `evidence:${normalize(title).slice(0, 96)}`;

const foundationLabel = (foundation: DocumentAnalysisResult['legalFoundations'][number]) => (
  `${foundation.law || foundation.title}${foundation.article ? ` · ${foundation.article}` : ''}`
);

export function buildFiscalEvidenceMatrix(
  result: DocumentAnalysisResult,
  files: Array<{ name: string }> = [],
  analysisId?: string,
): FiscalEvidenceRecord[] {
  const sourceFiles = unique(files.map((file) => file.name));
  const globalFoundations = unique((result.legalFoundations || []).map(foundationLabel));
  const supported = unique([
    ...(result.detectedObligations || []),
    ...(result.checklist || []),
  ]).map((title) => ({
    id: evidenceId('supported', title),
    analysisId,
    status: 'supported' as const,
    title,
    sourceFiles,
    foundations: globalFoundations,
  }));

  const missingValues = unique([
    ...(result.missingClauses || []),
    ...(result.missingData || []),
  ]);

  const attention = (result.risks || [])
    .filter((risk) => Boolean(risk?.title || risk?.explanation))
    .filter((risk) => !missingValues.some((missingItem) => normalize(missingItem) === normalize(risk.explanation || '')))
    .map((risk, index) => ({
    id: evidenceId('attention', risk.title || risk.explanation || `Hallazgo ${index + 1}`),
    analysisId,
    status: 'attention' as const,
    title: risk.title || `Hallazgo ${index + 1}`,
    detail: risk.explanation,
    sourceFiles,
    foundations: unique([
      ...(risk.legalFoundations || []).map(foundationLabel),
      ...globalFoundations,
    ]),
    action: result.recommendedActions?.[index],
  }));

  const missing = missingValues.map((title, index) => ({
    id: evidenceId('missing', title),
    analysisId,
    status: 'missing' as const,
    title,
    sourceFiles: [],
    foundations: globalFoundations,
    action: result.recommendedActions?.[index] || result.recommendedActions?.[0],
  }));

  return mergeFiscalEvidence([], [...supported, ...attention, ...missing]);
}

export function buildCfdiEvidence(records: FiscalCfdiRecord[]): FiscalEvidenceRecord[] {
  return records.map((record) => {
    const complete = Boolean(record.uuid && record.issuerRfc && record.receiverRfc && record.total);
    const title = record.uuid ? `Comprobante XML ${record.uuid}` : `Comprobante XML ${record.fileName}`;
    return {
      id: evidenceId(complete ? 'supported' : 'attention', title),
      analysisId: 'cfdi-local',
      status: complete ? 'supported' : 'attention',
      title,
      detail: unique([
        record.issuerRfc ? `Emisor ${record.issuerRfc}` : undefined,
        record.receiverRfc ? `Receptor ${record.receiverRfc}` : undefined,
        record.total ? `Total ${record.total}${record.currency ? ` ${record.currency}` : ''}` : undefined,
      ]).join(' · ') || 'El XML no contiene todos los datos esperados.',
      sourceFiles: [record.fileName],
      foundations: [],
      action: complete ? 'Conservar el comprobante junto con el expediente de la operación.' : 'Revisar la estructura del XML y completar los datos faltantes.',
    };
  });
}

export function mergeFiscalEvidence(
  current: FiscalEvidenceRecord[],
  incoming: FiscalEvidenceRecord[],
): FiscalEvidenceRecord[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = merged.get(item.id);
    merged.set(item.id, previous ? {
      ...previous,
      ...item,
      sourceFiles: unique([...previous.sourceFiles, ...item.sourceFiles]),
      foundations: unique([...previous.foundations, ...item.foundations]),
    } : item);
  }
  return [...merged.values()].slice(-60);
}

export function summarizeFiscalEvidence(items: FiscalEvidenceRecord[], resolvedIds: string[] = []) {
  const resolved = new Set(resolvedIds);
  return items.reduce((summary, item) => {
    if (item.status !== 'supported' && resolved.has(item.id)) summary.resolved += 1;
    else summary[item.status] += 1;
    return summary;
  }, { supported: 0, attention: 0, missing: 0, resolved: 0 });
}
