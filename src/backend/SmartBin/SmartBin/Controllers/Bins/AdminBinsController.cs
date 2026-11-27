using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Common.Swagger;
using SmartBin.Dtos.Bins;
using SmartBin.DTOs.Common;
using SmartBin.Models.Constants;
using SmartBin.Services.Audit;
using SmartBin.Services.Bins;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/admin/bins")]
    [Authorize(Roles = RoleNames.Admin)]
    public class AdminBinsController : ControllerBase
    {
        private readonly IBinService _binService;
        private readonly IAuditLogService _auditLogService;

        public AdminBinsController(
            IBinService binService,
            IAuditLogService auditLogService)
        {
            _binService = binService;
            _auditLogService = auditLogService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(PagedApiResponse<List<AdminBinDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminBinsListSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> GetAdminBins(
            [FromQuery] string? search,
            [FromQuery] string? district,
            [FromQuery] string? status,
            [FromQuery] int? collectorId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = "binId",
            [FromQuery] string? sortDir = "asc")
        {
            try
            {
                var (items, meta, summary) = await _binService.GetAdminBinsAsync(
                    search, district, status, collectorId, page, pageSize, sortBy, sortDir);

                return Ok(new
                {
                    success = true,
                    data = items,
                    meta,
                    summary
                });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    success = false,
                    error = new
                    {
                        code = ex.ErrorCode,
                        message = ex.Message,
                        details = ex.Details
                    }
                });
            }
        }

        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<RegisterBinResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status201Created, SwaggerExamples.AdminRegisterBinSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.AdminRegisterBinConflict)]
        public async Task<IActionResult> RegisterBin([FromBody] RegisterBinRequestDto request)
        {
            try
            {
                var result = await _binService.RegisterBinAsync(request);

                if (User.TryGetUserId(out int adminId))
                {
                    await _auditLogService.LogAsync(adminId, "BIN_REGISTER", "SMART_BIN", result.BinId);
                }

                return StatusCode(201, new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    success = false,
                    error = new
                    {
                        code = ex.ErrorCode,
                        message = ex.Message,
                        details = ex.Details
                    }
                });
            }
        }

        [HttpPut("{binId:int}")]
        [ProducesResponseType(typeof(ApiResponse<UpdateBinMetadataResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminUpdateBinSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        public async Task<IActionResult> UpdateBinMetadata(
            [FromRoute] int binId,
            [FromBody] UpdateBinMetadataRequestDto request)
        {
            try
            {
                var result = await _binService.UpdateBinMetadataAsync(binId, request);

                if (User.TryGetUserId(out int adminId))
                {
                    await _auditLogService.LogAsync(adminId, "BIN_UPDATE", "SMART_BIN", binId);
                }

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, new
                {
                    success = false,
                    error = new
                    {
                        code = ex.ErrorCode,
                        message = ex.Message,
                        details = ex.Details
                    }
                });
            }
        }
    }
}