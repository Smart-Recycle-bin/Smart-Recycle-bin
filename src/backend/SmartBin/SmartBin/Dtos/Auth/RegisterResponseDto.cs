namespace SmartBin.Dtos.Auth
{ 
    public class RegisterResponseDto
    {
        public int UserId { get; set; }

        public string Email { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public string Role { get; set; } = string.Empty;

        public bool IsVerified { get; set; }

        public DateTime CreatedAt { get; set; }

        public int Points { get; set; } = 0;
    }
}
