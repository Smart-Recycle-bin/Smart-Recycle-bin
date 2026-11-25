using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common.Swagger;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Sessions;
using SmartBin.DTOs.Surveys;
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
        [ProducesResponseType(typeof(ApiResponse<StartSessionResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status201Created, SwaggerExamples.StartSessionSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.StartSessionConflict)]
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
        [ProducesResponseType(typeof(ApiResponse<SessionStatusResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.SessionStatusSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
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
        [ProducesResponseType(typeof(ApiResponse<EndSessionResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.EndSessionSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.SessionNotActiveConflict)]
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
        [ProducesResponseType(typeof(ApiResponse<SessionSurveyResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.GetSessionSurveySuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.SurveyConflict)]
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
        [ProducesResponseType(typeof(ApiResponse<ConfirmSurveyResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.ConfirmSurveySuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.SurveyConflict)]
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
