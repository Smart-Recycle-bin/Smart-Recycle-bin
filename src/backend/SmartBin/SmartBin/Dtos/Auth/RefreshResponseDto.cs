namespace SmartBin.Dtos.Auth
{
    public class RefreshResponseDto
    {
        public string AccessToken { get; set; }
        public int ExpiresIn { get; set; }
        public string RefreshToken { get; set; }
    }
} 
   