using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Services.Surveys;

namespace SmartBin.Controllers.Surveys
{
    [ApiController]
    [Route("api/v1/admin/survey-qa")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminSurveyQaController : ControllerBase
    {
        private readonly IAdminSurveyQaService _surveyQaService;

        public AdminSurveyQaController(IAdminSurveyQaService surveyQaService)
        {
            _surveyQaService = surveyQaService;
        }

        /// <summary>
        /// E72 — Aggregated Survey QA KPIs, outcome split, daily rejection trend, and bin/category breakdowns
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            CancellationToken cancellationToken = default)
        {
            var summary = await _surveyQaService.GetSummaryAsync(from, to, cancellationToken);

            return Ok(new
            {
                success = true,
                data = summary
            });
        }

        /// <summary>
        /// E73 — Paginated recent survey outcomes
        /// </summary>
        [HttpGet("recent")]
        public async Task<IActionResult> GetRecentSurveys(
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            [FromQuery] string? outcome = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = "desc",
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _surveyQaService.GetRecentSurveysAsync(
                from,
                to,
                outcome,
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
    }
}
