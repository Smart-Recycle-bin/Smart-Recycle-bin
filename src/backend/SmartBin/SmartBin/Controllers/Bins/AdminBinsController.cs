using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Dtos.Bins;
using SmartBin.Services;
using SmartBin.Services.Bins;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/admin/bins")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminBinsController : ControllerBase
    {
        private readonly IBinService _binService;

        public AdminBinsController(IBinService binService)
        {
            _binService = binService;
        }

        /// <summary>
        /// E50 — Admin bin table
        /// </summary>
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

        /// <summary>
        /// E51 — Register bin
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> RegisterBin([FromBody] RegisterBinRequestDto request)
        {
            try
            {
                var result = await _binService.RegisterBinAsync(request);
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

        /// <summary>
        /// E53 — Update bin metadata
        /// </summary>
        [HttpPut("{binId:int}")]
        public async Task<IActionResult> UpdateBinMetadata(
            [FromRoute] int binId,
            [FromBody] UpdateBinMetadataRequestDto request)
        {
            try
            {
                var result = await _binService.UpdateBinMetadataAsync(binId, request);
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
