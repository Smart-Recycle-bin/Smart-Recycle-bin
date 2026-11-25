using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.DTOs.Profile;
using SmartBin.Services;
using SmartBin.Services.Profile;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/profile")]
    [Authorize]
    public class ProfileController : ControllerBase
    {
        private readonly ProfileService _profileService;

        public ProfileController(ProfileService profileService)
        {
            _profileService = profileService;
        }

        // ── GET /api/v1/profile ───────────────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId is null)
                    return Unauthorized(UnauthorizedBody());

                var result = await _profileService.GetProfileAsync(userId.Value);

                return Ok(new { success = true, data = result });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, ErrorBody(ex));
            }
        }

        // ── PUT /api/v1/profile ───────────────────────────────────────────────

        /// <summary>
        /// Update the authenticated user's profile.
        /// Accepts multipart/form-data (with optional photo) or application/json (no photo).
        /// </summary>
        [HttpPut]
        [Consumes("multipart/form-data", "application/json")]
        [RequestSizeLimit(5 * 1024 * 1024)] // 5 MB overall request guard
        public async Task<IActionResult> UpdateProfile(
            [FromForm] UpdateProfileRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId is null)
                    return Unauthorized(UnauthorizedBody());

                var result = await _profileService.UpdateProfileAsync(userId.Value, request);

                return Ok(new { success = true, data = result });
            }
            catch (ApiException ex) when (ex.StatusCode == 413)
            {
                return StatusCode(413, new
                {
                    success = false,
                    error   = new { code = ex.ErrorCode, message = ex.Message }
                });
            }
            catch (ApiException ex) when (ex.StatusCode == 415)
            {
                return StatusCode(415, new
                {
                    success = false,
                    error   = new { code = ex.ErrorCode, message = ex.Message }
                });
            }
            catch (ApiException ex)
            {
                return StatusCode(ex.StatusCode, ErrorBody(ex));
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private int? GetCurrentUserId()
        {
            var val = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("id");
            return int.TryParse(val, out var id) ? id : null;
        }

        private static object UnauthorizedBody() => new
        {
            success = false,
            error   = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
        };

        private static object ErrorBody(ApiException ex) => new
        {
            success = false,
            error   = new { code = ex.ErrorCode, message = ex.Message }
        };
    }
}
