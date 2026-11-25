using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
 using SmartBin.Dtos.Auth;
using SmartBin.DTOs.Auth;
using SmartBin.Services;
using SmartBin.Services.Auth;
using System.Security.Claims;

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


        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout(
         [FromBody] LogoutRequestDto? request)
        {
            try
            {
                 var userIdValue = User.FindFirstValue("id");

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

