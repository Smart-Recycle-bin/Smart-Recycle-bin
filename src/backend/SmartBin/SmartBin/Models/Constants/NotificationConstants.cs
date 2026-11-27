namespace SmartBin.Models.Constants
{
    public static class AdminNotificationTypes
    {
        public const string Info = "info";
        public const string Success = "success";
        public const string Warning = "warning";
        public const string Danger = "danger";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Info,
            Success,
            Warning,
            Danger
        };
    }

    public static class AdminNotificationAudiences
    {
        public const string SysAdminBroadcast = "SYS_ADMIN";
        public const string DirectAdmin = "DIRECT_ADMIN";
    }

    public static class AdminNotificationSources
    {
        public const string BinOffline = "BIN_OFFLINE";
        public const string InspectionReport = "INSPECTION_REPORT";
        public const string RewardStock = "REWARD_STOCK";
        public const string DirectAdmin = "DIRECT_ADMIN";
    }
}
