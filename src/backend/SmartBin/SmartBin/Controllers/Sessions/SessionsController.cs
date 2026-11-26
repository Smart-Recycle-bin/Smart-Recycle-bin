using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.DTOs.Sessions;
using SmartBin.Services;
using SmartBin.Services.Sessions;
using SmartBin.Services.Surveys;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1")]
    [Authorize(Roles = "USER_CITIZEN")]
    public class SessionsController : ControllerBase
    {
        private readonly ISessionService _sessionService;
        private readonly ISurveyService _surveyService;

        public SessionsController(
            ISessionService sessionService,
            ISurveyService surveyService)
        {
            _sessionService = sessionService;
            _surveyService = surveyService;
        }

        private static bool TryParseId(string raw, out int id)
        {
            var clean = raw.Replace("bin-", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("bin_", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("s-", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("s_", "", StringComparison.OrdinalIgnoreCase);
            return int.TryParse(clean, out id);
        }

        [HttpPost("bins/{binId}/sessions")]
        public async Task<IActionResult> StartSession(
            [FromRoute] string binId,
            [FromBody] StartSessionRequestDto request,
            CancellationToken cancellationToken)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            if (!TryParseId(binId, out int parsedBinId))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid binId format." }
                });
            }

            try
            {
                var result = await _sessionService.StartSessionAsync(userId, parsedBinId, request, cancellationToken);
                return StatusCode(StatusCodes.Status201Created, new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ErrorResponse(ex);
            }
        }

        [HttpGet("sessions/{sessionId}")]
        public async Task<IActionResult> GetSessionStatus(
            [FromRoute] string sessionId,
            CancellationToken cancellationToken)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            if (!TryParseId(sessionId, out int parsedSessionId))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid sessionId format." }
                });
            }

            try
            {
                var result = await _sessionService.GetSessionStatusAsync(userId, parsedSessionId, cancellationToken);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ErrorResponse(ex);
            }
        }

        [HttpPost("sessions/{sessionId}/end")]
        public async Task<IActionResult> EndSession(
            [FromRoute] string sessionId,
            CancellationToken cancellationToken)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            if (!TryParseId(sessionId, out int parsedSessionId))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid sessionId format." }
                });
            }

            try
            {
                var result = await _sessionService.EndSessionAsync(userId, parsedSessionId, cancellationToken);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ErrorResponse(ex);
            }
        }

        [HttpGet("sessions/{sessionId}/survey")]
        public async Task<IActionResult> GetSessionSurvey(
            [FromRoute] string sessionId,
            CancellationToken cancellationToken)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            if (!TryParseId(sessionId, out int parsedSessionId))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid sessionId format." }
                });
            }

            try
            {
                var result = await _surveyService.GetSessionSurveyAsync(userId, parsedSessionId, cancellationToken);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ErrorResponse(ex);
            }
        }

        [HttpPost("sessions/{sessionId}/survey/confirm")]
        public async Task<IActionResult> ConfirmSurvey(
            [FromRoute] string sessionId,
            CancellationToken cancellationToken)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            if (!TryParseId(sessionId, out int parsedSessionId))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid sessionId format." }
                });
            }

            try
            {
                var result = await _surveyService.ConfirmSurveyAsync(userId, parsedSessionId, cancellationToken);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (ApiException ex)
            {
                return ErrorResponse(ex);
            }
        }

        private bool TryGetCurrentUserId(out int userId)
        {
            var raw = User.FindFirstValue("id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out userId);
        }

        private IActionResult UnauthorizedError()
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

        private IActionResult ErrorResponse(ApiException ex)
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
