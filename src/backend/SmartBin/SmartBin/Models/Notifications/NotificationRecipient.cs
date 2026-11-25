using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("NOTIFICATION_RECIPIENT")]
    public class NotificationRecipient
    {
        public int NotificationId { get; set; }
        public int UserId { get; set; }

        [Required]
        public bool IsRead { get; set; } = false;

        public DateTime? ReadAt { get; set; }

        [ForeignKey(nameof(NotificationId))]
        public Notification Notification { get; set; } = null!;
    }
}