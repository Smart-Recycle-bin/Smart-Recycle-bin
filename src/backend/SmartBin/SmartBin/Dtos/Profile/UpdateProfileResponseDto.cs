
namespace SmartBin.DTOs.Profile
{
    public class UpdateProfileResponseDto
    {
        public int UserId { get; set; }

        public string DisplayName { get; set; }

        public string? PhoneNumber { get; set; }

        public string? ProfilePhotoUrl { get; set; }
    }
}
  