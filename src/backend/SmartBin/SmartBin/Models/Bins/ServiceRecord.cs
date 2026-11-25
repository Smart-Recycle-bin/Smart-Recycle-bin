using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("SERVICE_RECORD")]
    public class ServiceRecord
    {
        [Key]
        public int ServiceId { get; set; }

        public int BinId { get; set; }

        public int CollectorId { get; set; }

        public DateTime ServicedAt { get; set; } = DateTime.UtcNow;
         
        [Column(TypeName = "decimal(5, 2)")]
        public decimal? PreviousFillLevel { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        // Navigation properties
        [ForeignKey(nameof(BinId))]
        public SmartBin? Bin { get; set; }

        [ForeignKey(nameof(CollectorId))]
        public ApplicationUser? Collector { get; set; }
    }
}
