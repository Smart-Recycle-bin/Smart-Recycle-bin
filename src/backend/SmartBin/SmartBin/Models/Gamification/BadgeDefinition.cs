using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SmartBin.Models
{
    [Table("BADGE_DEFINITION")]
    public class BadgeDefinition
    {
        [Key]
        public int BadgeId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public int RequiredPoints { get; set; }

        [Required]
        [MaxLength(300)]
        public string Description { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Icon { get; set; } = "trophy";

        public bool IsActive { get; set; } = true;

        public int DisplayOrder { get; set; }
    }
}
