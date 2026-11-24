namespace SmartBin.Dtos.Bins
{
    public class AdminBinDto
    {
        public int BinId { get; set; }
        public string? District { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal FillLevel { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? CollectorId { get; set; }
        public string? CollectorName { get; set; }
        public DateTime? LastServicedAt { get; set; }
    }

    public class AdminBinSummaryDto
    {
        public int LabelledImages { get; set; }
        public int PendingReviews { get; set; }
        public int ReviewedReports { get; set; }
        public int ImagesUntilNextRetraining { get; set; }
        public int NextRetrainingThreshold { get; set; }
    }
}
