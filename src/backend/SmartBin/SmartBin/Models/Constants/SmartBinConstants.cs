namespace SmartBin.Models.Constants
{
    public static class SmartBinStatus
    {
        public const string Available = "AVAILABLE";
        public const string Full80 = "FULL_80";
        public const string NeedsService95 = "NEEDS_SERVICE_95";
        public const string Offline = "OFFLINE";

        public static readonly string[] All = { Available, Full80, NeedsService95, Offline };

        public static bool IsValid(string status) =>
            All.Contains(status, StringComparer.OrdinalIgnoreCase);

        public static string ToCitizenStatus(string status) =>
            string.Equals(status, Available, StringComparison.OrdinalIgnoreCase) ? Available : "UNAVAILABLE";
    }

    public static class WasteTypeNames
    {
        public const string Plastic = "PLASTIC";
        public const string Metal = "METAL";
        public const string Paper = "PAPER";
        public const string Organic = "ORGANIC";
        public const string Trash = "TRASH";

        public static readonly string[] All = { Plastic, Metal, Paper, Organic, Trash };
    }
}
