
using System.ComponentModel.DataAnnotations;

namespace SmartBin.Models
{
	public class RewardCategory
	{
		public int CategoryId { get; set; }

		[Required]
		public string Name { get; set; } = null!;

		public string? LogoUrl { get; set; }

		public bool IsActive { get; set; } = true;

		public DateTime CreatedAt { get; set; }

		public DateTime? UpdatedAt { get; set; }

		public ICollection<Reward> Rewards { get; set; } = new List<Reward>();
	}
}
