namespace SmartBin.DTOs.Auth
{
    public class LoginUserDto
    {
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? ProfilePhotoUrl { get; set; }
        public int Points { get; set; }
    }
}
