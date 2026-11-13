export const SurveyOutcome = {
  Confirmed: 'confirmed',
  Rejected: 'rejected',
} as const;

export type SurveyOutcome = (typeof SurveyOutcome)[keyof typeof SurveyOutcome];

export const SURVEY_OUTCOME_LABELS: Record<SurveyOutcome, string> = {
  [SurveyOutcome.Confirmed]: 'Confirmed',
  [SurveyOutcome.Rejected]: 'Rejected',
};
