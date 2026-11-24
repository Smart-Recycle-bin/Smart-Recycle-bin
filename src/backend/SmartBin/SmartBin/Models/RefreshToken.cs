namespace SmartBin.Models
{

    

    public class RefreshToken
    {
        public int RefreshTokenId { get; set; }

        public int UserId { get; set; }

        public string TokenHash { get; set; } 

        public string FamilyId { get; set; } 

        public DateTime ExpiresAt { get; set; }

        public DateTime CreatedAt { get; set; } 

        public DateTime? RevokedAt { get; set; }

       
        public int? ReplacedByTokenId { get; set; }

        public string CreatedByIp { get; set; }

        public string UserAgent { get; set; }

        public ApplicationUser User { get; set; } 

        public RefreshToken? ReplacedByToken { get; set; }
    }

}
