
namespace SmartBin.Models
{
    public class Wallet
    {
        public int WalletId { get; set; }

        public int UserId { get; set; }

        public int AvailablePoints { get; set; } 

        public int LifetimeEarnedPoints { get; set; }  

        public ApplicationUser User { get; set; } 
    }
}

