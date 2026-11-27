using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Common.Swagger;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Inspections;
using SmartBin.Models.Constants;
using SmartBin.Services.Inspections;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/admin/inspections")]
    [Authorize(Roles = RoleNames.Admin)]
    public class AdminInspectionsController : ControllerBase
    {
        private readonly IInspectionService _inspectionService;

        public AdminInspectionsController(IInspectionService inspectionService)
        {
            _inspectionService = inspectionService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<InspectionListItemDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminInspectionsListSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> List(
            [FromQuery] string? status,
            [FromQuery] string? search,
            [FromQuery] string? sortBy,
            [FromQuery] string? sortDir,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken cancellationToken = default)
        {
            var (items, summary, meta) = await _inspectionService.ListAsync(
                status,
                search,
                sortBy,
                sortDir,
                page,
                pageSize,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = items,
                summary,
                meta
            });
        }

        [HttpGet("{reportId:int}")]
        [ProducesResponseType(typeof(ApiResponse<InspectionDetailDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminInspectionDetailSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        public async Task<IActionResult> Get(
            [FromRoute] int reportId,
            CancellationToken cancellationToken = default)
        {
            var detail = await _inspectionService.GetAsync(reportId, cancellationToken);
            return Ok(new
            {
                success = true,
                data = detail
            });
        }

        [HttpPost("{reportId:int}/correct")]
        [ProducesResponseType(typeof(ApiResponse<ResolveInspectionResultDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminInspectionResolveSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
        public async Task<IActionResult> Correct(
            [FromRoute] int reportId,
            [FromBody] CorrectInspectionRequestDto? body,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out int adminId))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
                });
            }

            var result = await _inspectionService.CorrectAsync(
                adminId,
                reportId,
                body?.WasteTypeId,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("{reportId:int}/dismiss")]
        [ProducesResponseType(typeof(ApiResponse<ResolveInspectionResultDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminInspectionResolveSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
        public async Task<IActionResult> Dismiss(
            [FromRoute] int reportId,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out int adminId))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
                });
            }

            var result = await _inspectionService.DismissAsync(
                adminId,
                reportId,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("{reportId:int}/retrain")]
        [ProducesResponseType(typeof(ApiResponse<RetrainResultDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminInspectionRetrainSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
        public async Task<IActionResult> Retrain(
            [FromRoute] int reportId,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out int adminId))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
                });
            }

            var result = await _inspectionService.RetrainAsync(
                adminId,
                reportId,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }
    }
}