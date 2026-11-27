using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("SMART_BIN")]
    public class SmartBin
    {
        [Key]
        public int BinId { get; set; }

        [Required]
        [MaxLength(100)]
        public string SerialNumber { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? Name { get; set; }

        [MaxLength(150)]
        public string? Area { get; set; }

        [Required]
        [MaxLength(255)] 
        public string QRCode { get; set; } = string.Empty;

        [Column(TypeName = "decimal(10, 7)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(10, 7)")]
        public decimal? Longitude { get; set; }

        [MaxLength(150)]
        public string? District { get; set; }

        [Column(TypeName = "decimal(5, 2)")]
        public decimal FillLevel { get; set; } = 0;

        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "AVAILABLE";

        [Column(TypeName = "decimal(8, 2)")]
        public decimal? CapacityThreshold { get; set; }

        public int? CollectorId { get; set; }

        public DateTime? AssignedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? LastHeartbeatAt { get; set; }

        // Navigation properties
        [ForeignKey(nameof(CollectorId))]
        public ApplicationUser? Collector { get; set; }

        public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
    }
}
