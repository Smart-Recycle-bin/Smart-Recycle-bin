namespace SmartBin.Models
{

    public class AuthOtp
    {
        public int OtpId { get; set; }

        public int UserId { get; set; }

        public string Purpose { get; set; } 

        public string OtpHash { get; set; } 

        public DateTime CreatedAt { get; set; }

        public DateTime ExpiresAt { get; set; }

        public int FailedAttempts { get; set; } = 0;

        public DateTime? ConsumedAt { get; set; }

        public DateTime? InvalidatedAt { get; set; }

        public ApplicationUser User { get; set; } 
    }

}
