using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Dtos.Bins;
using SmartBin.DTOs.Common;
using SmartBin.Services;
using SmartBin.Services.Bins;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/sessions")]
    public class SessionItemsController : ControllerBase
    {
        private readonly IIngestionService _ingestionService;

        public SessionItemsController(IIngestionService ingestionService)
        {
            _ingestionService = ingestionService;
        }

        /// <summary>
        /// E21 — Submit detected item (device ingestion)
        /// </summary>
        [HttpPost("{sessionId:int}/items")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<IngestItemResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> IngestItem(
            [FromRoute] int sessionId,
            [FromForm] IngestItemRequestDto request,
            [FromHeader(Name = "X-Device-Key")] string? deviceKey)
        {
            // Security verification: Device is a separate actor and must NEVER authenticate with a Recycler JWT
            var userRole = User.FindFirst("role")?.Value;
            if (string.Equals(userRole, "USER_CITIZEN", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(401, new
                {
                    success = false,
                    error = new
                    {
                        code = "UNAUTHORIZED",
                        message = "Recycler JWT is not permitted for bin device item ingestion."
                    }
                });
            }

            try
            {
                var result = await _ingestionService.IngestItemAsync(sessionId, request, deviceKey);
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
    }
}
