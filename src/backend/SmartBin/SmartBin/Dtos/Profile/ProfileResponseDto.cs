namespace SmartBin.DTOs.Profile
{
    public class ProfileResponseDto
    {
        public int UserId { get; set; }

        public string Email { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }

        public string? ProfilePhotoUrl { get; set; }

        public string Role { get; set; } = string.Empty;

        public int Points { get; set; }
    }
}
