namespace SmartBin.DTOs.Profile
{
    public class UpdateProfileResponseDto
    {
        public int UserId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? ProfilePhotoUrl { get; set; }
    }
}
