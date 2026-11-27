using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Services.Gamification;

namespace SmartBin.Controllers.Gamification
{
    [ApiController]
    public class GamificationController : ControllerBase
    {
        private readonly IGamificationService _gamificationService;

        public GamificationController(IGamificationService gamificationService)
        {
            _gamificationService = gamificationService;
        }

        /// <summary>
        /// E31 — Leaderboard rankings (rolling 7d/30d earned credit points or all-time lifetime points)
        /// </summary>
        [HttpGet("api/v1/leaderboard")]
        [Authorize(Roles = "SYS_ADMIN,USER_CITIZEN")]
        public async Task<IActionResult> GetLeaderboard(
            [FromQuery] string? scope = "weekly",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = null,
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _gamificationService.GetLeaderboardAsync(
                scope,
                page,
                pageSize,
                sortBy,
                sortDir,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = items,
                meta
            });
        }

        /// <summary>
        /// E28 — Milestone badge definitions and earned counts across citizen wallets
        /// </summary>
        [HttpGet("api/v1/admin/badges")]
        [Authorize(Roles = "SYS_ADMIN")]
        public async Task<IActionResult> GetMilestoneBadges(CancellationToken cancellationToken = default)
        {
            var badges = await _gamificationService.GetMilestoneBadgesAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                data = badges
            });
        }
    }
}
