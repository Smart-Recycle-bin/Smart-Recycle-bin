using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Auth
{
    public class LogoutRequestDto
    {
        public string? RefreshToken { get; set; }
    }
} 