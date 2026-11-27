namespace SmartBin.Dtos.Bins
{
    public class CitizenBinDto
    {
        public int BinId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string QrCode { get; set; } = string.Empty;
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal FillLevel { get; set; }
        public string? District { get; set; }
        public int? DistanceMeters { get; set; }
        public int? WalkingTimeMinutes { get; set; }
    }
}
