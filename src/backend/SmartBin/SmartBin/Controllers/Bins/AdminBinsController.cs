using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Dtos.Bins;
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