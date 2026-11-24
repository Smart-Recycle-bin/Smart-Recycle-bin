namespace SmartBin.DTOs
{
    public class RewardCategoryResponseDto
    {
        public int CategoryId { get; set; }
        public string Name { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string? LogoUrl { get; set; }
    }
}