namespace SmartBin.DTOs.Gamification
{
    public class LeaderboardEntryDto
    {
        public int Rank { get; set; }
        public int UserId { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string Initials { get; set; } = string.Empty;
        public int LifetimePoints { get; set; }
        public int Points { get; set; }
        public string Scope { get; set; } = string.Empty;
        public decimal? RecyclingVolumeKg { get; set; }
    }

    public class MilestoneBadgeDto
    {
        public int BadgeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public int RequiredPoints { get; set; }
        public string Description { get; set; } = string.Empty;
        public string ThresholdText { get; set; } = string.Empty;
        public int EarnedCount { get; set; }
        public string Icon { get; set; } = string.Empty;
    }
}
