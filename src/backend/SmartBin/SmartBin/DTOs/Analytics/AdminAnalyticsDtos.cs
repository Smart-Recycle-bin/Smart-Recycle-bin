namespace SmartBin.DTOs.Analytics
{
    public class OverviewKpiCardDto
    {
        public double? Value { get; set; }
        public double? DeltaPercent { get; set; }
        public double? DeltaPp { get; set; }
        public bool? TrendPositive { get; set; }
    }

    public class PointsTimeSeriesPointDto
    {
        public string Date { get; set; } = string.Empty;
        public int Issued { get; set; }
        public int Redeemed { get; set; }
    }

    public class FleetHealthBreakdownDto
    {
        public int TotalBins { get; set; }
        public int Available { get; set; }
        public int EightyPercentFull { get; set; }
        public int NeedsServicing { get; set; }
        public int Offline { get; set; }
    }

    public class MaterialVolumeShareDto
    {
        public string Material { get; set; } = string.Empty;
        public double Percentage { get; set; }
        public int ItemCount { get; set; }
        public decimal? Tonnage { get; set; }
    }

    public class MetricTrendPointDto
    {
        public string Date { get; set; } = string.Empty;
        public double Value { get; set; }
    }

    public class BinNeedingAttentionItemDto
    {
        public int BinId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public decimal FillLevel { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class PendingAiReviewItemDto
    {
        public int ReportId { get; set; }
        public string PredictedType { get; set; } = string.Empty;
        public decimal? Confidence { get; set; }
        public string Feedback { get; set; } = string.Empty;
    }

    public class ContaminationHotspotDto
    {
        public string Category { get; set; } = string.Empty;
        public double RejectionRate { get; set; }
    }

    public class AdminOverviewAnalyticsDto
    {
        public OverviewKpiCardDto DailyActiveUsers { get; set; } = new();
        public OverviewKpiCardDto PointsIssued { get; set; } = new();
        public OverviewKpiCardDto PointsRedeemed { get; set; } = new();
        public OverviewKpiCardDto ContaminationRate { get; set; } = new();
        public int BinsNeedingServiceCount { get; set; }
        public int PendingAiReviewsCount { get; set; }

        public List<PointsTimeSeriesPointDto> PointsComparisonSeries { get; set; } = new();
        public FleetHealthBreakdownDto FleetHealth { get; set; } = new();

        public decimal? TotalRecycledTonnage { get; set; }
        public int TotalDisposalItems { get; set; }
        public List<MaterialVolumeShareDto> MaterialShares { get; set; } = new();
        public Dictionary<string, int> RecyclingVolumeByType { get; set; } = new();

        public List<MetricTrendPointDto> ContaminationTrend { get; set; } = new();
        public List<MetricTrendPointDto>? DauTrend { get; set; }

        public List<BinNeedingAttentionItemDto> UrgentBins { get; set; } = new();
        public List<PendingAiReviewItemDto> UrgentReviews { get; set; } = new();
        public List<ContaminationHotspotDto> TopContaminationHotspots { get; set; } = new();
    }
}
