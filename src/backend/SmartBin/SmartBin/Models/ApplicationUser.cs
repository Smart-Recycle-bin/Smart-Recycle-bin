using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace SmartBin.Models
{
    public class ApplicationUser : IdentityUser<int>
    {
        [Required]
        public string DisplayName { get; set; }

        public string? ProfilePhoto { get; set; }

        public string AccountStatus { get; set; } = "active";

        public DateTime CreatedAt { get; set; } 

        public int WarningCount { get; set; } = 0;

        public DateTime LastActiveAt { get; set; }
    }
}
