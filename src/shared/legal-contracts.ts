export type LegalAnalysisEcosystem = 'fiscal';
export type LegalDraftingArea = 'mercantil' | 'laboral' | 'fiscal';
export type LegalEcosystem = LegalDraftingArea;
export type LegalWorkflowModule = 'analysis' | 'drafting';
export type AiExecutionMode = 'local' | 'byok';

export type AnalysisPromptProfile = 'fiscal_analysis';
export type DraftingPromptProfile = 'mercantil_drafting' | 'laboral_drafting' | 'fiscal_drafting';
export type LegalPromptProfile = AnalysisPromptProfile | DraftingPromptProfile;

export const ANALYSIS_PROMPT_PROFILES: Record<LegalAnalysisEcosystem, AnalysisPromptProfile> = {
  fiscal: 'fiscal_analysis',
};

export const DRAFTING_PROMPT_PROFILES: Record<LegalDraftingArea, DraftingPromptProfile> = {
  mercantil: 'mercantil_drafting',
  laboral: 'laboral_drafting',
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
