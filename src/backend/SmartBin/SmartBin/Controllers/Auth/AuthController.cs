using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common.Swagger;
using SmartBin.Dtos.Auth;
using SmartBin.DTOs.Auth;
using SmartBin.DTOs.Common;
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
        [ProducesResponseType(typeof(ApiResponse<LoginResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthLoginSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status401Unauthorized, SwaggerExamples.AuthLoginUnauthorized)]
        [SwaggerResponseExample(StatusCodes.Status403Forbidden, SwaggerExamples.AuthLoginForbidden)]
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
        [ProducesResponseType(typeof(ApiResponse<RegisterResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status201Created, SwaggerExamples.AuthRegisterSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.AuthRegisterConflict)]
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
        [ProducesResponseType(typeof(ApiResponse<VerifyEmailResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status429TooManyRequests)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthVerifyEmailSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.AuthInvalidOtp)]
        [SwaggerResponseExample(StatusCodes.Status429TooManyRequests, SwaggerExamples.AuthTooManyAttempts)]
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
        [ProducesResponseType(typeof(ApiResponse<ResendVerificationOtpResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status429TooManyRequests)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthResendOtpSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status429TooManyRequests, SwaggerExamples.AuthTooManyRequests)]
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
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthLogoutSuccess)]
        [SwaggerResponseExample(StatusCodes.Status401Unauthorized, SwaggerExamples.Unauthorized)]
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
        [ProducesResponseType(typeof(ApiResponse<RefreshResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthRefreshSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status401Unauthorized, SwaggerExamples.AuthRefreshUnauthorized)]
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
        [ProducesResponseType(typeof(ApiResponse<ForgotPasswordResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status429TooManyRequests)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthForgotPasswordSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status429TooManyRequests, SwaggerExamples.AuthTooManyRequests)]
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
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status429TooManyRequests)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthVerifyResetOtpSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.AuthInvalidOtp)]
        [SwaggerResponseExample(StatusCodes.Status429TooManyRequests, SwaggerExamples.AuthTooManyAttempts)]
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
        [ProducesResponseType(typeof(ApiResponse<ResetPasswordResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status429TooManyRequests)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AuthResetPasswordSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.AuthInvalidOtp)]
        [SwaggerResponseExample(StatusCodes.Status429TooManyRequests, SwaggerExamples.AuthTooManyAttempts)]
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

