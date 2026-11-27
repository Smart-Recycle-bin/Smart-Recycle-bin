using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations;

namespace SmartBin.Models
{
    public class ApplicationUser : IdentityUser<int>
    {
        public string DisplayName { get; set; }

        public string? ProfilePhoto { get; set; } 

        public string AccountStatus { get; set; } = "active";

        public DateTime CreatedAt { get; set; } 

        public int WarningCount { get; set; } = 0;

        public DateTime LastActiveAt { get; set; }

        [MaxLength(150)]
        public string? District { get; set; }

        public DateTime? DeactivatedAt { get; set; }

        public int? DeactivatedByAdminId { get; set; }

        public DateTime? SuspendedAt { get; set; }

        [MaxLength(500)]
        public string? SuspensionReason { get; set; }

        public int? SuspendedByAdminId { get; set; }

        public DateTime? UnsuspendedAt { get; set; }

        [MaxLength(500)]
        public string? UnsuspensionReason { get; set; }

        public int? UnsuspendedByAdminId { get; set; }
    }
}
