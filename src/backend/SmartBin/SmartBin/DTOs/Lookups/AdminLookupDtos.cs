namespace SmartBin.DTOs.Lookups
{
    public class AdminLookupItemDto
    {
        public int AdminId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
    }

    public class CollectorLookupItemDto
    {
        public int CollectorId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
    }

    public class DistrictLookupItemDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Region { get; set; }
    }
}
