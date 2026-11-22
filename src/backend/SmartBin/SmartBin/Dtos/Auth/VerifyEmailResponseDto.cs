
namespace SmartBin.DTOs.Auth
{
    public class VerifyEmailResponseDto
    {
        public string Message { get; set; } = string.Empty;
        public bool IsVerified { get; set; }
    }
}
