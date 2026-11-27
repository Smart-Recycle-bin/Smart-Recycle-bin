using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("ADMIN_NOTIFICATION")]
    public class AdminNotification
    {
        [Key]
        public int NotificationId { get; set; }

        public int TargetAdminId { get; set; }

        [Required]
        [MaxLength(40)]
        public string Audience { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Message { get; set; }

        [Required]
        [MaxLength(20)]
        public string Type { get; set; } = "info";

        [Required]
        [MaxLength(50)]
        public string SourceType { get; set; } = string.Empty;

        [MaxLength(64)]
        public string? SourceReferenceId { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? ReadAt { get; set; }

        public ApplicationUser? TargetAdmin { get; set; }
    }
}
