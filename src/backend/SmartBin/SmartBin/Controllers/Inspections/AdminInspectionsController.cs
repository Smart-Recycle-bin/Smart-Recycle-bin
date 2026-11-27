using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.DTOs.Inspections;
using SmartBin.Services.Inspections;

namespace SmartBin.Controllers.Inspections
{
    [ApiController]
    [Route("api/v1/admin/inspections")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminInspectionsController : ControllerBase
    {
        private readonly IAdminInspectionService _inspectionService;

        public AdminInspectionsController(IAdminInspectionService inspectionService)
        {
            _inspectionService = inspectionService;
        }

        /// <summary>
        /// E65 — Paginated inspection review queue
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetReports(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = "desc",
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _inspectionService.GetReportsAsync(
                status,
                search,
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
        /// E66 — Inspection summary metrics based on persisted report counts
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(CancellationToken cancellationToken = default)
        {
            var summary = await _inspectionService.GetSummaryAsync(cancellationToken);
            return Ok(new
            {
                success = true,
                data = summary
            });
        }

        /// <summary>
        /// E67 — Inspection report detail
        /// </summary>
        [HttpGet("{reportId:int}")]
        public async Task<IActionResult> GetReportDetail(
            [FromRoute] int reportId,
            CancellationToken cancellationToken = default)
        {
            var detail = await _inspectionService.GetReportDetailAsync(reportId, cancellationToken);
            return Ok(new
            {
                success = true,
                data = detail
            });
        }

        /// <summary>
        /// E68 — Correct predicted waste category and resolve inspection report
        /// </summary>
        [HttpPost("{reportId:int}/correct")]
        public async Task<IActionResult> CorrectReport(
            [FromRoute] int reportId,
            [FromBody] CorrectInspectionReportRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _inspectionService.CorrectReportAsync(
                reportId,
                actorAdminId,
                request,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        /// <summary>
        /// E69 — Dismiss report and confirm original classification
        /// </summary>
        [HttpPost("{reportId:int}/dismiss")]
        public async Task<IActionResult> DismissReport(
            [FromRoute] int reportId,
            [FromBody] DismissInspectionReportRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _inspectionService.DismissReportAsync(
                reportId,
                actorAdminId,
                request,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        /// <summary>
        /// E70 — Record resolved report in local retraining queue (no request body; uses Admin-confirmed label)
        /// </summary>
        [HttpPost("{reportId:int}/retrain")]
        public async Task<IActionResult> QueueForRetraining(
            [FromRoute] int reportId,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _inspectionService.QueueReportForRetrainingAsync(
                reportId,
                actorAdminId,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        /// <summary>
        /// E71 — Waste type options lookup from WASTE_TYPE table
        /// </summary>
        [HttpGet("/api/v1/admin/waste-types")]
        public async Task<IActionResult> GetWasteTypes(CancellationToken cancellationToken = default)
        {
            var items = await _inspectionService.GetWasteTypesAsync(cancellationToken);
            return Ok(new
            {
                success = true,
                data = items
            });
        }

        private UnauthorizedObjectResult UnauthorizedError()
        {
            return Unauthorized(new
            {
                success = false,
                error = new
                {
                    code = "UNAUTHORIZED",
                    message = "Access token is missing or invalid."
                }
            });
        }
    }
}
