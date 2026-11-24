using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Dtos.Bins;
using SmartBin.DTOs.Common;
using SmartBin.Services;
using SmartBin.Services.Bins;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/bins")]
    public class BinsController : ControllerBase
    {
        private readonly IBinService _binService;

        public BinsController(IBinService binService)
        {
            _binService = binService;
        }

        /// <summary>
        /// E60 — Citizen bin map
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<CitizenBinDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> GetNearbyBins(
            [FromQuery] double? lat,
            [FromQuery] double? lng,
            [FromQuery] double? radiusKm = 1.0)
        {
            try
            {
                var bins = await _binService.GetNearbyBinsAsync(lat, lng, radiusKm);
                return Ok(new
                {
                    success = true,
                    data = bins
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
        /// E64 — Search bins and locations
        /// </summary>
        [HttpGet("search")]
        [ProducesResponseType(typeof(ApiResponse<List<SearchBinDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> SearchBins(
            [FromQuery] string query,
            [FromQuery] double? lat,
            [FromQuery] double? lng,
            [FromQuery] int limit = 20)
        {
            try
            {
                var results = await _binService.SearchBinsAsync(query, lat, lng, limit);
                return Ok(new
                {
                    success = true,
                    data = results
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
        /// E61 — Bin details
        /// </summary>
        [HttpGet("{binId:int}")]
        [ProducesResponseType(typeof(ApiResponse<BinDetailsDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetBinDetails([FromRoute] int binId)
        {
            try
            {
                var role = User.FindFirst("role")?.Value ?? "USER_CITIZEN";
                var details = await _binService.GetBinDetailsAsync(binId, role);
                return Ok(new
                {
                    success = true,
                    data = details
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
