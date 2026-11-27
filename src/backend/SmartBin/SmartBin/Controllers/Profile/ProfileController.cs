using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common.Swagger;
using SmartBin.DTOs.Common;
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
        [ProducesResponseType(typeof(ApiResponse<ProfileResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.ProfileGetSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.ProfileNotFound)]
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
        [ProducesResponseType(typeof(ApiResponse<UpdateProfileResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status413PayloadTooLarge)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status415UnsupportedMediaType)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.ProfileUpdateSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status413PayloadTooLarge, SwaggerExamples.PayloadTooLarge)]
        [SwaggerResponseExample(StatusCodes.Status415UnsupportedMediaType, SwaggerExamples.UnsupportedMediaType)]
        public async Task<IActionResult> UpdateProfile(
            [FromForm] UpdateProfileRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId is null)
                    return Unauthorized(UnauthorizedBody());

                // [FromForm] leaves request empty when Content-Type is application/json;
                // deserialize and validate the JSON body explicitly so both content types work.
                if (!Request.HasFormContentType &&
                    Request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
                {
                    UpdateProfileRequestDto? jsonRequest;
                    try
                    {
                        jsonRequest = await Request.ReadFromJsonAsync<UpdateProfileRequestDto>();
                    }
                    catch (JsonException)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = new { code = "VALIDATION_ERROR", message = "Invalid JSON payload." }
                        });
                    }

                    if (jsonRequest is null)
                    {
                        return BadRequest(new
                        {
                            success = false,
                            error = new { code = "VALIDATION_ERROR", message = "Invalid request data." }
                        });
                    }

                    var validationResults = new List<ValidationResult>();
                    if (!Validator.TryValidateObject(
                            jsonRequest,
                            new ValidationContext(jsonRequest),
                            validationResults,
                            validateAllProperties: true))
                    {
                        var errors = validationResults.Select(r => new
                        {
                            field = r.MemberNames.FirstOrDefault() ?? string.Empty,
                            message = r.ErrorMessage ?? "Invalid value."
                        }).ToList();

                        return BadRequest(new
                        {
                            success = false,
                            error = new
                            {
                                code = "VALIDATION_ERROR",
                                message = "Invalid request data.",
                                details = errors
                            }
                        });
                    }

                    request = jsonRequest;
                }

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
