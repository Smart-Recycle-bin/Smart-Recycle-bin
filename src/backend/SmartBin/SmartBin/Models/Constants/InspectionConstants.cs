namespace SmartBin.Models.Constants
{
    public static class InspectionReportStatus
    {
        public const string Pending = "pending";
        public const string Reviewed = "reviewed";
        public const string SentToRetraining = "sent_to_retraining";

        public static readonly string[] All = { Pending, Reviewed, SentToRetraining };
    }

    public static class InspectionReviewDecision
    {
        public const string Approved = "approved";
        public const string Rejected = "rejected";

        public static readonly string[] All = { Approved, Rejected };
    }

    public static class InspectionRetrainingStatus
    {
        public const string NotSent = "not_sent";
        public const string Queued = "queued";

        public static readonly string[] All = { NotSent, Queued };
    }
}
