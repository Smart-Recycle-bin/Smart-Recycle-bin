namespace SmartBin.DTOs.Profile
{
    public class ProfileResponseDto
    {
        public int UserId { get; set; }

        public string Email { get; set; }  

        public string DisplayName { get; set; }  

        public string? PhoneNumber { get; set; }

        public string? ProfilePhotoUrl { get; set; }

        public string Role { get; set; } 
    }
}