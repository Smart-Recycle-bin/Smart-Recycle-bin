using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Dtos.Auth;
using SmartBin.DTOs.Auth;
using SmartBin.Services;
using SmartBin.Services.Auth;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(
            [FromBody] LoginRequestDto request)
        {
           

            try
            {
                var result = await _authService.LoginAsync(request);

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

        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterRequestDto request)
        {
            try
            {
                var result = await _authService.RegisterAsync(request);

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


        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail(
            [FromBody] VerifyEmailRequestDto request)
        {
            try
            {
                var result = await _authService.VerifyEmailAsync(request);

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

        [HttpPost("resend-verification-otp")]
        public async Task<IActionResult> ResendVerificationOtp(
            [FromBody] ResendVerificationOtpRequestDto request)
        {
            try
            {
                var result =
                    await _authService.ResendVerificationOtpAsync(request);

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


        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(
         [FromBody] LogoutRequestDto? request)
        {
            try
            {
                if (!User.TryGetUserId(out int userId))
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

                 await _authService.LogoutAsync(
                    userId,
                    request?.RefreshToken
                );

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        message = "Logged out successfully"
                    }
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
        }

        [AllowAnonymous]
        [HttpPost("refresh")]
        [HttpPost("refresh-token")]
        public async Task<IActionResult> Refresh(
          [FromBody] RefreshRequestDto request)
        {
            try
            {
                var result = await _authService.RefreshAsync(request);

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



        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(
            [FromBody] ForgotPasswordRequestDto request)
        {
            try
            {
                var result = await _authService.ForgotPasswordAsync(request);

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

        [AllowAnonymous]
        [HttpPost("verify-reset-otp")]
        public async Task<IActionResult> VerifyResetOtp(
            [FromBody] VerifyResetOtpRequestDto request)
        {
            try
            {
                var result = await _authService.VerifyResetOtpAsync(request);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        verified = result,
                        message = "OTP verified successfully."
                    }
                });
            }
            catch (ApiException ex)
            {
                return ApiErrorResult(ex);
            }
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(
            [FromBody] ResetPasswordRequestDto request)
        {
            try
            {
                var result = await _authService.ResetPasswordAsync(request);

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

        private ObjectResult ApiErrorResult(ApiException ex)
        {
            var errorPayload = ex.Details != null
                ? new
                {
                    code = ex.ErrorCode,
                    message = ex.Message,
                    details = ex.Details
                }
                : (object)new
                {
                    code = ex.ErrorCode,
                    message = ex.Message
                };

            return StatusCode(ex.StatusCode, new
            {
                success = false,
                error = errorPayload
            });
        }
    }
}

