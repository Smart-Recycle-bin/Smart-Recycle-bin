using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System;

namespace depi_project.Data.Entities
{
    [Table("AUDIT_LOG")]
    public class AuditLog
    {
        [Key]
        public int AuditLogId { get; set; }
        [Required]
        public int AdminId { get; set; }
        [Required, MaxLength(80)]
        public string ActionType { get; set; } = string.Empty;
        [Required, MaxLength(80)]
        public string ResourceType { get; set; } = string.Empty;
        [Required]
        public int ResourceId { get; set; }
        [MaxLength(500)]
        public string? Reason { get; set; }
        [MaxLength(64)]
        public string? IpAddress { get; set; }
        [Required]
        public DateTime Timestamp { get; set; }
    }
}
