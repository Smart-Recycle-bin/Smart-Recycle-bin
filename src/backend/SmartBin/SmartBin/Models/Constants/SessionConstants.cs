namespace SmartBin.Models.Constants
{
    public static class SessionStatus
    {
        public const string Active = "active";
        public const string Terminated = "terminated";
        public const string PendingSurvey = "pending_survey";
        public const string Completed = "completed";

        public static readonly string[] All = { Active, Terminated, PendingSurvey, Completed };
    }

    public static class PointsStatus
    {
        public const string Pending = "pending";
        public const string Awarded = "awarded";

        public static readonly string[] All = { Pending, Awarded };
    }

    public static class SurveyStatus
    {
        public const string Waiting = "waiting";
        public const string Done = "done";

        public static readonly string[] All = { Waiting, Done };
    }

    public static class SurveyOutcome
    {
        public const string Confirmed = "confirmed";
        public const string CorrectionSubmitted = "correction_submitted";

        public static readonly string[] All = { Confirmed, CorrectionSubmitted };
    }

    public static class LedgerTransactionType
    {
        public const string Credit = "credit";
        public const string Debit = "debit";

        public static readonly string[] All = { Credit, Debit };
    }

    public static class LedgerSource
    {
        public const string SessionAward = "session_award";
        public const string VoucherRedemption = "voucher_redemption";
        public const string ManualAdjustment = "manual_adjustment";

        public static readonly string[] All = { SessionAward, VoucherRedemption, ManualAdjustment };
    }

    public static class SessionTerminationReason
    {
        public const string Manual = "manual";
        public const string Timeout = "timeout";
    }
}
