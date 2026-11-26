namespace SmartBin.DTOs
{
    public class CatalogCardDto
    {
        public int ItemId { get; set; }
        public int CategoryId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public int StartingPointsCost { get; set; }
        public int OptionsCount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CatalogOptionDto
    {
        public int ItemId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int PointsCost { get; set; }
        public bool InStock { get; set; }
    }

    public class CatalogDetailDto
    {
        public int ItemId { get; set; }
        public int CategoryId { get; set; }
        public string Brand { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? LogoUrl { get; set; }
        public int PointsCost { get; set; }
        public bool InStock { get; set; }
        public DateTime? ValidUntil { get; set; }
        public List<CatalogOptionDto> Options { get; set; } = new();
    }

    public class RedemptionResultDto
    {
        public int RedemptionId { get; set; }
        public int ItemId { get; set; }
        public int VoucherId { get; set; }
        public string VoucherCode { get; set; } = string.Empty;
        public int PointsSpent { get; set; }
        public decimal ValueEgpAtRedemption { get; set; }
        public int NewAvailablePoints { get; set; }
    }
}