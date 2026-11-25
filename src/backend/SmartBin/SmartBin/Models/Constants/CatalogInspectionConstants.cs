namespace SmartBin.Models.Constants
{
    public static class RoleNames
    {
        public const string Citizen = "USER_CITIZEN";
        public const string Collector = "OPS_COLLECTOR";
        public const string Admin = "SYS_ADMIN";
    }

    public static class InspectionReviewDecision
    {
        public const string Pending = "pending";
        public const string Approved = "approved";
        public const string Rejected = "rejected";

        public static readonly string[] All = { Pending, Approved, Rejected };
    }

    public static class RetrainingStatus
    {
        public const string NotSent = "not_sent";
        public const string Queued = "queued";
        public const string Sent = "sent";
        public const string Failed = "failed";

        public static readonly string[] All = { NotSent, Queued, Sent, Failed };
    }

    public static class VoucherStatus
    {
        public const string Unused = "unused";
        public const string Used = "used";
        public const string Expired = "expired";

        public static readonly string[] All = { Unused, Used, Expired };
    }

    public static class CatalogSettings
    {
        public const int PointsPerEgp = 100;
        public const int RetrainingThreshold = 1500;
        public const string QrBaseUrl = "https://cdn.ecobin.app/vouchers";
    }
}