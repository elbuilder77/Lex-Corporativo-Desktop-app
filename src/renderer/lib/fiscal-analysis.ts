import { getAnalysisPromptProfile, type AnalysisPromptProfile, type LegalAnalysisEcosystem } from '../../shared/legal-contracts';
import type { DocumentAnalysisResult } from '../types';

export interface FiscalEvidenceUpload {
  name: string;
  mimeType: string;
  base64: string;
}

export interface FiscalAnalysisResponse {
  result: DocumentAnalysisResult;
  requestId: string;
  ecosystem: LegalAnalysisEcosystem;
  promptProfile: AnalysisPromptProfile;
  requestedExecutionMode: 'byok';
  engine: 'byok';
  provider?: 'gemini' | 'openai' | 'anthropic';
  fallbackReason?: string;
}

const FALLBACK_RESULT: DocumentAnalysisResult = {
  summary: 'El motor devolvió una respuesta sin estructura completa. Revise el contenido antes de tomar una decisión.',
  documentType: 'Revisión corporativa',
  riskScore: 0,
  detectedParties: [],
  detectedObligations: [],
  missingClauses: [],
  missingData: [],
  risks: [],
  recommendedActions: [],
  checklist: [],
  riskCategories: {},
  legalFoundations: [],
  confidence: 'low',
  engine: 'byok',
};

function extractJson(raw: string): string {
  const withoutFence = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  return firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence;
}

export function parseFiscalAnalysisResult(raw: unknown): DocumentAnalysisResult {
  if (raw && typeof raw === 'object') return raw as DocumentAnalysisResult;
  if (typeof raw !== 'string') return { ...FALLBACK_RESULT };

  try {
    const parsed = JSON.parse(extractJson(raw)) as DocumentAnalysisResult;
    return {
      ...FALLBACK_RESULT,
      ...parsed,
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      legalFoundations: Array.isArray(parsed.legalFoundations) ? parsed.legalFoundations : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
    };
  } catch {
    return { ...FALLBACK_RESULT, summary: raw };
  }
}

function encodeUtf8Base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function textEvidence(name: string, content: string): FiscalEvidenceUpload {
  return {
    name,
    mimeType: 'text/plain',
    base64: encodeUtf8Base64(content),
  };
}

export function fileToEvidence(file: File): Promise<FiscalEvidenceUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve({
        name: file.name,
        mimeType: file.name.toLowerCase().endsWith('.md')
          ? 'text/markdown'
          : file.name.toLowerCase().endsWith('.xml')
            ? 'application/xml'
            : (file.type || 'application/octet-stream'),
        base64: value.includes(',') ? value.split(',')[1] : value,
      });
    };
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

export async function runFiscalAnalysis(input: {
  caseId?: string;
  context: string;
  instruction: string;
  files?: File[];
  syntheticFileName: string;
  ecosystem?: LegalAnalysisEcosystem;
}): Promise<FiscalAnalysisResponse> {
  const ecosystem = input.ecosystem || 'mercantil';
  const evidence = input.files?.length
    ? await Promise.all(input.files.map(fileToEvidence))
    : [textEvidence(input.syntheticFileName, input.context)];
  const response = await window.lexDesktop.analysis.analyzeDocument({
    caseId: input.caseId,
    files: evidence,
    focusedInstruction: `${input.instruction}\n\nCONTEXTO DECLARADO POR EL USUARIO:\n${input.context}`,
    ecosystem,
    module: 'analysis',
    currentDocumentOnly: true,
    promptProfile: getAnalysisPromptProfile(ecosystem),
  });

  const result = parseFiscalAnalysisResult(response.result);
  result.engine = 'byok';
  return { ...response, result } as FiscalAnalysisResponse;
}
