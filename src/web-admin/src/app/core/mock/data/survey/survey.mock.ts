import { SurveyOutcome } from '@models/survey/survey-outcome.enum';
import { RecentSurveyRow, SurveyQaSummary } from '@models/survey/survey.view-model';

export const MOCK_RECENT_SURVEYS: RecentSurveyRow[] = [
  // 6 visible rows from PDF p11 (Showing 1-6 of 9)
  {
    sessionId: 'S-88213',
    userName: 'Omar Hassan',
    itemsSummary: '3× PET bottle',
    points: 36,
    result: SurveyOutcome.Rejected,
  },
  {
    sessionId: 'S-88205',
    userName: 'Nour El-Sayed',
    itemsSummary: '2× Cardboard',
    points: 18,
    result: SurveyOutcome.Confirmed,
  },
  {
    sessionId: 'S-88190',
    userName: 'Mariam Adel',
    itemsSummary: '1× Aluminium tray',
    points: 14,
    result: SurveyOutcome.Rejected,
  },
  {
    sessionId: 'S-88177',
    userName: 'Hana Farouk',
    itemsSummary: '6× PET bottle',
    points: 54,
    result: SurveyOutcome.Confirmed,
  },
  {
    sessionId: 'S-88160',
    userName: 'Yasmin Gamal',
    itemsSummary: '4× Paper cup',
    points: 24,
    result: SurveyOutcome.Confirmed,
  },
  {
    sessionId: 'S-88142',
    userName: 'Dina Samir',
    itemsSummary: '4× Glass bottle',
    points: 48,
    result: SurveyOutcome.Confirmed,
  },
  // Additional rows to complete the 9 total indicated on p11 ("1-6 of 9")
  {
    sessionId: 'S-88125',
    userName: 'Ali Reda',
    itemsSummary: '5× Steel can',
    points: 45,
    result: SurveyOutcome.Confirmed, // synthetic
  },
  {
    sessionId: 'S-88099',
    userName: 'Khaled Wahba',
    itemsSummary: '2× Glass jar',
    points: 20,
    result: SurveyOutcome.Confirmed, // synthetic
  },
  {
    sessionId: 'S-88082',
    userName: 'Salma Ibrahim',
    itemsSummary: '1× Cardboard, 3× Can',
    points: 32,
    result: SurveyOutcome.Rejected, // synthetic
  },
];

export const MOCK_SURVEY_QA_SUMMARY: SurveyQaSummary = {
  kpis: {
    totalSurveys: 18402,
    confirmRate: 92.6,
    confirmRateDeltaPp: 0.8,
    rejectRate: 7.4,
    rejectRateDeltaPp: -0.8,
    flaggedToAiQueue: 1362,
  },
  confirmCount: 17040,
  rejectCount: 1362,
  rejectionTrend: [
    { date: '2025-06-01', rejectionRate: 5.0 },
    { date: '2025-06-02', rejectionRate: 5.5 },
    { date: '2025-06-03', rejectionRate: 6.0 },
    { date: '2025-06-04', rejectionRate: 7.2 },
    { date: '2025-06-05', rejectionRate: 8.5 },
    { date: '2025-06-06', rejectionRate: 7.1 },
    { date: '2025-06-07', rejectionRate: 6.0 },
    { date: '2025-06-08', rejectionRate: 6.0 },
    { date: '2025-06-09', rejectionRate: 6.0 },
    { date: '2025-06-10', rejectionRate: 7.4 },
    { date: '2025-06-11', rejectionRate: 8.8 },
    { date: '2025-06-12', rejectionRate: 7.9 },
    { date: '2025-06-13', rejectionRate: 7.4 },
  ],
  highestRejectionBins: [
    { binId: 'BIN-0084', rejectionRate: 14.2 },
    { binId: 'BIN-0007', rejectionRate: 12.8 },
    { binId: 'BIN-0061', rejectionRate: 11.1 },
    { binId: 'BIN-0042', rejectionRate: 9.6 },
    { binId: 'BIN-0029', rejectionRate: 8.3 },
    { binId: 'BIN-0018', rejectionRate: 7.7 },
  ],
  rejectionByCategory: [
    { category: 'Mixed packaging', rejectionRate: 19.4 },
    { category: 'Plastic (HDPE)', rejectionRate: 11.2 },
    { category: 'Plastic (PET)', rejectionRate: 8.9 },
    { category: 'Paper', rejectionRate: 7.1 },
    { category: 'Glass', rejectionRate: 4.3 },
    { category: 'Metal', rejectionRate: 3.6 },
  ],
  recentSurveys: MOCK_RECENT_SURVEYS,
};
