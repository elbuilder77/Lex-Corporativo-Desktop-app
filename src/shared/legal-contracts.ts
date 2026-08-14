export const LEGAL_ECOSYSTEMS = ['mercantil', 'laboral', 'comercio_exterior', 'aduanal', 'fiscal'] as const;
export type LegalAnalysisEcosystem = typeof LEGAL_ECOSYSTEMS[number];
export type LegalDraftingArea = LegalAnalysisEcosystem;
export type LegalEcosystem = LegalDraftingArea;
export type LegalWorkflowModule = 'analysis' | 'drafting';
export type AiExecutionMode = 'local' | 'byok';

export type AnalysisPromptProfile = `${LegalAnalysisEcosystem}_analysis`;
export type DraftingPromptProfile = `${LegalDraftingArea}_drafting`;
export type LegalPromptProfile = AnalysisPromptProfile | DraftingPromptProfile;

export const ANALYSIS_PROMPT_PROFILES: Record<LegalAnalysisEcosystem, AnalysisPromptProfile> = {
  mercantil: 'mercantil_analysis',
  laboral: 'laboral_analysis',
  comercio_exterior: 'comercio_exterior_analysis',
  aduanal: 'aduanal_analysis',
  fiscal: 'fiscal_analysis',
};

export const DRAFTING_PROMPT_PROFILES: Record<LegalDraftingArea, DraftingPromptProfile> = {
  mercantil: 'mercantil_drafting',
  laboral: 'laboral_drafting',
  comercio_exterior: 'comercio_exterior_drafting',
  aduanal: 'aduanal_drafting',
  fiscal: 'fiscal_drafting',
};

export function getAnalysisPromptProfile(ecosystem: LegalAnalysisEcosystem): AnalysisPromptProfile {
  return ANALYSIS_PROMPT_PROFILES[ecosystem];
}

export function getDraftingPromptProfile(ecosystem: LegalDraftingArea): DraftingPromptProfile {
  return DRAFTING_PROMPT_PROFILES[ecosystem];
}

export function isPromptProfileForEcosystem(profile: string | undefined, ecosystem: LegalEcosystem): boolean {
  return !profile || profile.startsWith(`${ecosystem}_`);
}
