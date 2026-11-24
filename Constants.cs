namespace EcoBin.Api;

public static class RoleNames
{
    public const string Citizen = "USER_CITIZEN";
    public const string Admin = "SYS_ADMIN";
}

public static class Review          // INSPECTION_REPORT.ReviewDecision
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
}

public static class RetrainStatus    // INSPECTION_REPORT.RetrainingStatus
{
    public const string NotSent = "not_sent";
    public const string Queued = "queued";
    public const string Sent = "sent";
    public const string Failed = "failed"; // <-- Added
}

public static class VoucherStatus
{
    public const string Unused = "unused";
    public const string Used = "used";
    public const string Expired = "expired";
}

public static class Settings
{
    public const int PointsPerEgp = 100;             // ASSUMPTION: 1000 points = 10 EGP
    public const int RetrainingThreshold = 1500;     // images needed for the next retraining
    public const string QrBaseUrl = "https://cdn.ecobin.app/vouchers";
    public static readonly string[] WasteTypeNames = { "PLASTIC", "METAL", "PAPER", "ORGANIC", "TRASH" };
}
