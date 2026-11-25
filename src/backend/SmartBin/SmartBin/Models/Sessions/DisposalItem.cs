using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("DISPOSAL_ITEM")]
    public class DisposalItem
    {
        [Key]
        public int ItemId { get; set; }

        public int SessionId { get; set; }

        public int WasteTypeId { get; set; } 

        [Required]
        [MaxLength(500)]
        public string Image { get; set; } = string.Empty;

        public DateTime DetectedAt { get; set; } = DateTime.UtcNow;

        public int EstimatedPoints { get; set; }

        [Column(TypeName = "decimal(5, 4)")]
        public decimal? AIConfidence { get; set; }

        // Navigation property
        [ForeignKey(nameof(WasteTypeId))]
        public WasteType? WasteType { get; set; }
    }
}
