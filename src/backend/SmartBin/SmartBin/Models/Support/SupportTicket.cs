using System.ComponentModel.DataAnnotations;

namespace SmartBin.Models
{
    public class SupportTicket
    {
        public int SupportTicketId { get; set; }

        [Required]
        [MaxLength(20)]
        public string TicketCode { get; set; } = null!;

        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Category { get; set; } = "general_inquiry";

        [Required]
        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(64)]
        public string? SessionId { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "open";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ApplicationUser? User { get; set; }
    }
}
