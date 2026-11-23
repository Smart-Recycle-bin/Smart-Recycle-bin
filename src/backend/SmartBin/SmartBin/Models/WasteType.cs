using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("WASTE_TYPE")]
    public class WasteType
    {
        [Key]
        public int WasteTypeId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Description { get; set; }

        public int BasePoints { get; set; }

        public ICollection<DisposalItem> DisposalItems { get; set; } = new List<DisposalItem>();
    }
}
