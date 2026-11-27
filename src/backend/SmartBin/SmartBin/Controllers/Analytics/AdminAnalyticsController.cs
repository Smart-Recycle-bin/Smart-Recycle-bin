using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Services.Analytics;

namespace SmartBin.Controllers.Analytics
{
    [ApiController]
    [Route("api/v1/admin/analytics")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminAnalyticsController : ControllerBase
    {
        private readonly IAdminAnalyticsService _analyticsService;

        public AdminAnalyticsController(IAdminAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        /// <summary>
        /// E81 — Operational Overview Dashboard analytics from persisted database records
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetOverviewAnalytics(
            [FromQuery] string? period = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            CancellationToken cancellationToken = default)
        {
            var data = await _analyticsService.GetOverviewAnalyticsAsync(
                period,
                from,
                to,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data
            });
        }
    }
}
