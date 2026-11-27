namespace SmartBin.Models.Constants
{
    public static class AuditActionTypes
    {
        public const string BinAssignment = "BIN_ASSIGN";
        public const string FleetUpdate = "FLEET_UPDATE";
        public const string BinRegistration = "BIN_REGISTER";
        public const string LedgerAdjustment = "LEDGER_ADJUSTMENT";
        public const string UserSuspension = "USER_SUSPEND";
        public const string UserUnsuspension = "USER_UNSUSPEND";
        public const string UserBan = "USER_BAN";
        public const string CatalogChange = "CATALOG_CHANGE";
        public const string RewardCreate = "REWARD_CREATE";
        public const string RewardUpdate = "REWARD_UPDATE";
        public const string RewardArchive = "REWARD_ARCHIVE";
        public const string CollectorProvisioning = "COLLECTOR_PROVISION";
        public const string CollectorUpdate = "COLLECTOR_UPDATE";
        public const string CollectorDeactivation = "COLLECTOR_DEACTIVATE";
        public const string InspectionCorrect = "INSPECTION_CORRECT";
        public const string InspectionDismiss = "INSPECTION_DISMISS";
        public const string InspectionRetrain = "INSPECTION_RETRAIN";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            BinAssignment,
            FleetUpdate,
            BinRegistration,
            LedgerAdjustment,
            UserSuspension,
            UserUnsuspension,
            UserBan,
            CatalogChange,
            RewardCreate,
            RewardUpdate,
            RewardArchive,
            CollectorProvisioning,
            CollectorUpdate,
            CollectorDeactivation,
            InspectionCorrect,
            InspectionDismiss,
            InspectionRetrain
        };
    }

    public static class AuditResourceTypes
    {
        public const string User = "USER";
        public const string Collector = "COLLECTOR";
        public const string SmartBin = "SMART_BIN";
        public const string Reward = "REWARD";
        public const string InspectionReport = "INSPECTION_REPORT";
        public const string Wallet = "WALLET";

        public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            User,
            Collector,
            SmartBin,
            Reward,
            InspectionReport,
            Wallet
        };
    }
}
