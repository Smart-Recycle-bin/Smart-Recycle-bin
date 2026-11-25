namespace SmartBin.Dtos.Bins
{
    public class AdminBinDto
    {
        public int BinId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Area { get; set; }
        public string? District { get; set; }
        public string? Region { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal FillLevel { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? CollectorId { get; set; }
        public string? CollectorName { get; set; }
        public DateTime? LastServicedAt { get; set; }
    }

    public class BinMapItemDto
    {
        public string BinId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal FillLevel { get; set; }
        public string? CollectorName { get; set; }
        public DateTime? LastServicedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class BinMapMetaDto
    {
        public int TotalItems { get; set; }
        public int Returned { get; set; }
        public bool Truncated { get; set; }
        public DateTime GeneratedAt { get; set; }
    }

    public class AssignBinRequestDto
    {
        public string CollectorId { get; set; } = string.Empty;
    }

    public class AssignBinResponseDto
    {
        public string BinId { get; set; } = string.Empty;
        public string AssignedCollectorId { get; set; } = string.Empty;
        public string AssignedAt { get; set; } = string.Empty;
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
