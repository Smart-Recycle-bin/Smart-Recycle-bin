namespace SmartBin.DTOs.Wallet
{
    public class WalletBalanceResponseDto
    {
        public int AvailablePoints { get; set; }
        public int LifetimeEarnedPoints { get; set; }
    }

    public class LedgerEntryDto
    {
        public int TransactionId { get; set; }
        public DateTime Timestamp { get; set; }
        public string TimeFormatted => Timestamp > DateTime.UtcNow.AddHours(-1)
            ? $"{(int)Math.Max(1, (DateTime.UtcNow - Timestamp).TotalMinutes)} min ago"
            : Timestamp.ToString("MMM dd, h:mm tt");
        public int? BinId { get; set; }
        public string EntryType { get; set; } = string.Empty;
        public string Type => PointsDelta >= 0 ? "credit" : "debit";
        public string Title { get; set; } = string.Empty;
        public int PointsDelta { get; set; }
        public int BalanceAfter { get; set; }
        public string Source { get; set; } = string.Empty;
        public int? SourceId { get; set; }
    }

    public class WalletDebitResultDto
    {
        public int WalletId { get; set; }
        public int TransactionId { get; set; }
        public int PointsDeducted { get; set; }
        public int NewAvailablePoints { get; set; }
    }
}
