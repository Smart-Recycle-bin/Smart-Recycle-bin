export const InspectionReportStatus = {
  Pending: 'pending',
  Reviewed: 'reviewed',
  SentToRetraining: 'sent_to_retraining', // PROPOSED (UI p9)
} as const;

export type InspectionReportStatus =
  (typeof InspectionReportStatus)[keyof typeof InspectionReportStatus];

export const INSPECTION_REPORT_STATUS_LABELS: Record<InspectionReportStatus, string> = {
  [InspectionReportStatus.Pending]: 'Pending',
  [InspectionReportStatus.Reviewed]: 'Reviewed',
  [InspectionReportStatus.SentToRetraining]: 'Sent to Retraining',
};
