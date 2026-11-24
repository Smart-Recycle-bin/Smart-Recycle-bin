
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Services;
using SmartBin.DTOs.Profile;
using System.Security.Claims;

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
            _profileService = profileService    ;
        }

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                // Get current user's ID from JWT
                var userIdValue = User.FindFirstValue(
                    ClaimTypes.NameIdentifier
                );

                if (!int.TryParse(userIdValue, out int userId))
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

                var result = await _profileService.GetProfileAsync(userId);

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
                        message = ex.Message
                    }
                });
            }
        }


        [HttpPut]
        public async Task<IActionResult> UpdateProfile(
            [FromBody] UpdateProfileRequestDto request)
        {
            try
            {
                // 1. Get current user ID from JWT
                var userIdValue = User.FindFirstValue(
                    ClaimTypes.NameIdentifier
                );

                if (!int.TryParse(userIdValue, out int userId))
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

                // 2. Update profile
                var result = await _profileService.UpdateProfileAsync(
                    userId,
                    request
                );

                // 3. Return response
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
                        message = ex.Message
                    }
                });
            }
        }

    }
}
