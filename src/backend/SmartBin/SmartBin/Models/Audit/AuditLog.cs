using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("AUDIT_LOG")]
    public class AuditLog
    {
        [Key]
        public int AuditId { get; set; }

        public int AdminId { get; set; }

        [Required]
        [MaxLength(150)]
        public string AdminName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ActionType { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string ResourceType { get; set; } = string.Empty;

        [Required]
        [MaxLength(64)]
        public string ResourceId { get; set; } = string.Empty;

        [Required]
        [MaxLength(1000)]
        public string Justification { get; set; } = string.Empty;

        [Required]
        [MaxLength(64)]
        public string IpAddress { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public ApplicationUser? Admin { get; set; }
    }
}
