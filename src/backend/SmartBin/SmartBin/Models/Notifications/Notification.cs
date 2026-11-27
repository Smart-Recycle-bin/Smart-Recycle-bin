using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("NOTIFICATION")]
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }

        [Required, MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required, MaxLength(1000)]
        public string Message { get; set; } = string.Empty;

        [Required, MaxLength(20)]
        public string Type { get; set; } = "info";

        [Required, MaxLength(40)]
        public string TargetType { get; set; } = "ADMIN_BROADCAST";

        [MaxLength(80)]
        public string? ResourceType { get; set; }

        [MaxLength(100)]
        public string? ResourceId { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        public DateTime? ExpiresAt { get; set; }

        public ICollection<NotificationRecipient> Recipients { get; set; } = new List<NotificationRecipient>();
    }
}