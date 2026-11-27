using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
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
                var (items, meta) = await _binService.GetAdminBinsAsync(
                    search, district, status, collectorId, page, pageSize, sortBy, sortDir);

                return Ok(new
                {
                    success = true,
                    data = items,
                    meta
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
        }

        /// <summary>
        /// E52 — Live bin map feed
        /// </summary>
        [HttpGet("map")]
        public async Task<IActionResult> GetMapBins(
            [FromQuery] string? region,
            [FromQuery] string? status,
            [FromQuery] string? bbox)
        {
            try
            {
                var (items, meta) = await _binService.GetMapBinsAsync(region, status, bbox);
                Response.Headers.CacheControl = "no-store";

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        items,
                        meta
                    }
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
        }

        /// <summary>
        /// E51 — Register bin
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> RegisterBin(
            [FromBody] RegisterBinRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            try
            {
                var result = await _binService.RegisterBinAsync(request, actorAdminId, cancellationToken);
                return StatusCode(201, new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
        }

        /// <summary>
        /// E53 — Update bin metadata
        /// </summary>
        [HttpPut("{binId:int}")]
        public async Task<IActionResult> UpdateBinMetadata(
            [FromRoute] int binId,
            [FromBody] UpdateBinMetadataRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            try
            {
                var result = await _binService.UpdateBinMetadataAsync(binId, request, actorAdminId, cancellationToken);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
        }

        /// <summary>
        /// E54 — Assign collector to bin
        /// </summary>
        [HttpPost("{binId:int}/assignment")]
        public async Task<IActionResult> AssignCollector(
            [FromRoute] int binId,
            [FromBody] AssignBinRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            try
            {
                var result = await _binService.AssignCollectorAsync(binId, request, actorAdminId, cancellationToken);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
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

        private IActionResult ApiErrorResult(ApiException ex)
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
