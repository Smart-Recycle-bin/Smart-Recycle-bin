import { describe, expect, it } from 'vitest';
import {
  AccountStatus,
  ACCOUNT_STATUS_LABELS,
  AnalyticsPeriod,
  ANALYTICS_PERIOD_LABELS,
  ApiErrorCode,
  API_ERROR_CODE_LABELS,
  AuditActionType,
  AUDIT_ACTION_TYPE_LABELS,
  BinStatus,
  BIN_STATUS_LABELS,
  CollectorCredentialsMode,
  COLLECTOR_CREDENTIALS_MODE_LABELS,
  InspectionReportStatus,
  INSPECTION_REPORT_STATUS_LABELS,
  LeaderboardScope,
  LEADERBOARD_SCOPE_LABELS,
  LedgerEntryType,
  LEDGER_ENTRY_TYPE_LABELS,
  LedgerSource,
  LEDGER_SOURCE_LABELS,
  NotificationType,
  NOTIFICATION_TYPE_LABELS,
  RewardCategory,
  REWARD_CATEGORY_LABELS,
  RewardStatus,
  REWARD_STATUS_LABELS,
  SurveyOutcome,
  SURVEY_OUTCOME_LABELS,
  UserRole,
  USER_ROLE_LABELS,
  VoucherCodeType,
  VOUCHER_CODE_TYPE_LABELS,
} from './index';

describe('Models Root Barrel Runtime Exports & Label Maps', () => {
  it('should export UserRole and its label map matching its enum values', () => {
    expect(UserRole.Admin).toBe('SYS_ADMIN');
    expect(UserRole.Collector).toBe('OPS_COLLECTOR');
    expect(UserRole.Citizen).toBe('USER_CITIZEN');
    expect(Object.keys(USER_ROLE_LABELS).sort()).toEqual(Object.values(UserRole).sort());
  });

  it('should export AccountStatus and its label map matching its enum values', () => {
    expect(AccountStatus.Active).toBe('active');
    expect(AccountStatus.Suspended).toBe('suspended');
    expect(AccountStatus.Banned).toBe('banned');
    expect(AccountStatus.Inactive).toBe('inactive');
    expect(Object.keys(ACCOUNT_STATUS_LABELS).sort()).toEqual(Object.values(AccountStatus).sort());
  });

  it('should export BinStatus and its label map matching its enum values', () => {
    expect(BinStatus.Available).toBe('AVAILABLE');
    expect(BinStatus.EightyPercentFull).toBe('≥80% FULL');
    expect(BinStatus.NeedsServicing).toBe('≥95% FULL / NEEDS SERVICING');
    expect(BinStatus.Offline).toBe('offline');
    expect(Object.keys(BIN_STATUS_LABELS).sort()).toEqual(Object.values(BinStatus).sort());
  });

  it('should export LedgerEntryType and its label map matching its enum values', () => {
    expect(LedgerEntryType.Credit).toBe('credit');
    expect(LedgerEntryType.Debit).toBe('debit');
    expect(Object.keys(LEDGER_ENTRY_TYPE_LABELS).sort()).toEqual(Object.values(LedgerEntryType).sort());
  });

  it('should export LedgerSource and its label map matching its enum values', () => {
    expect(LedgerSource.SessionConfirm).toBe('session_confirm');
    expect(LedgerSource.VoucherRedemption).toBe('voucher_redemption');
    expect(LedgerSource.ManualAdjustment).toBe('manual_adjustment');
    expect(Object.keys(LEDGER_SOURCE_LABELS).sort()).toEqual(Object.values(LedgerSource).sort());
  });

  it('should export RewardStatus and its label map matching its enum values', () => {
    expect(RewardStatus.InStock).toBe('in_stock');
    expect(RewardStatus.OutOfStock).toBe('out_of_stock');
    expect(RewardStatus.Archived).toBe('archived');
    expect(Object.keys(REWARD_STATUS_LABELS).sort()).toEqual(Object.values(RewardStatus).sort());
  });

  it('should export RewardCategory and its label map matching its enum values', () => {
    expect(Object.keys(RewardCategory).length).toBe(8);
    expect(Object.keys(REWARD_CATEGORY_LABELS).sort()).toEqual(Object.values(RewardCategory).sort());
  });

  it('should export VoucherCodeType and its label map matching its enum values', () => {
    expect(VoucherCodeType.Code).toBe('code');
    expect(VoucherCodeType.Qr).toBe('qr');
    expect(VoucherCodeType.Barcode).toBe('barcode');
    expect(Object.keys(VOUCHER_CODE_TYPE_LABELS).sort()).toEqual(Object.values(VoucherCodeType).sort());
  });

  it('should export InspectionReportStatus and its label map matching its enum values', () => {
    expect(InspectionReportStatus.Pending).toBe('pending');
    expect(InspectionReportStatus.Reviewed).toBe('reviewed');
    expect(InspectionReportStatus.SentToRetraining).toBe('sent_to_retraining');
    expect(Object.keys(INSPECTION_REPORT_STATUS_LABELS).sort()).toEqual(Object.values(InspectionReportStatus).sort());
  });

  it('should export SurveyOutcome and its label map matching its enum values', () => {
    expect(SurveyOutcome.Confirmed).toBe('confirmed');
    expect(SurveyOutcome.Rejected).toBe('rejected');
    expect(Object.keys(SURVEY_OUTCOME_LABELS).sort()).toEqual(Object.values(SurveyOutcome).sort());
  });

  it('should export LeaderboardScope and its label map matching its enum values', () => {
    expect(LeaderboardScope.Weekly).toBe('weekly');
    expect(LeaderboardScope.Monthly).toBe('monthly');
    expect(LeaderboardScope.AllTime).toBe('all-time');
    expect(Object.keys(LEADERBOARD_SCOPE_LABELS).sort()).toEqual(Object.values(LeaderboardScope).sort());
  });

  it('should export AuditActionType and its label map matching its enum values', () => {
    expect(AuditActionType.UserSuspension).toBe('USER_SUSPEND');
    expect(AuditActionType.CollectorProvisioning).toBe('COLLECTOR_PROVISION');
    expect(Object.keys(AUDIT_ACTION_TYPE_LABELS).sort()).toEqual(Object.values(AuditActionType).sort());
  });

  it('should export AnalyticsPeriod and its label map matching its enum values', () => {
    expect(AnalyticsPeriod.Today).toBe('today');
    expect(AnalyticsPeriod.SevenDays).toBe('7d');
    expect(AnalyticsPeriod.ThirtyDays).toBe('30d');
    expect(AnalyticsPeriod.Custom).toBe('custom');
    expect(Object.keys(ANALYTICS_PERIOD_LABELS).sort()).toEqual(Object.values(AnalyticsPeriod).sort());
  });

  it('should export CollectorCredentialsMode and its label map matching its enum values', () => {
    expect(CollectorCredentialsMode.InviteLink).toBe('invite_link');
    expect(CollectorCredentialsMode.TemporaryPassword).toBe('temporary_password');
    expect(Object.keys(COLLECTOR_CREDENTIALS_MODE_LABELS).sort()).toEqual(Object.values(CollectorCredentialsMode).sort());
  });

  it('should export NotificationType and its label map matching its enum values', () => {
    expect(NotificationType.Info).toBe('info');
    expect(NotificationType.Success).toBe('success');
    expect(NotificationType.Warning).toBe('warning');
    expect(NotificationType.Danger).toBe('danger');
    expect(Object.keys(NOTIFICATION_TYPE_LABELS).sort()).toEqual(Object.values(NotificationType).sort());
  });

  it('should export ApiErrorCode and its label map matching its enum values', () => {
    expect(ApiErrorCode.InvalidRefreshToken).toBe('INVALID_REFRESH_TOKEN');
    expect(ApiErrorCode.AccountSuspended).toBe('ACCOUNT_SUSPENDED');
    expect(Object.keys(API_ERROR_CODE_LABELS).sort()).toEqual(Object.values(ApiErrorCode).sort());
  });
});
