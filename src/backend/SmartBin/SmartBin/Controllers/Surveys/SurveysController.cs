using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common.Swagger;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Surveys;
using SmartBin.Services;
using SmartBin.Services.Surveys;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/surveys")]
    [Authorize(Roles = "USER_CITIZEN")]
    public class SurveysController : ControllerBase
    {
        private readonly ISurveyService _surveyService;

        public SurveysController(ISurveyService surveyService)
        {
            _surveyService = surveyService;
        }

        private static bool TryParseSurveyId(string raw, out int id)
        {
            var clean = raw.Replace("srv-", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("srv_", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("s-", "", StringComparison.OrdinalIgnoreCase);
            return int.TryParse(clean, out id);
        }

        [HttpGet]
        [ProducesResponseType(typeof(PagedSurveysResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.GetMySurveysSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> GetMySurveys(
            [FromQuery] string? status = "all",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken cancellationToken = default)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            try
            {
                var (items, meta) = await _surveyService.GetMySurveysAsync(
                    userId,
                    status,
                    page,
                    pageSize,
                    cancellationToken);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        surveys = items,
                        meta
                    },
                    meta
                });
            }
            catch (ApiException ex)
            {
                return ErrorResponse(ex);
            }
        }

        [HttpPost("{surveyId:int}/submit")]
        [ProducesResponseType(typeof(ApiResponse<SubmitSurveyCorrectionsResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.SubmitSurveyCorrectionsSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.SurveyConflict)]
        public async Task<IActionResult> SubmitCorrections(
            [FromRoute] string surveyId,
            [FromBody] SubmitSurveyCorrectionsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            if (!TryParseSurveyId(surveyId, out int parsedSurveyId))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid surveyId format." }
                });
            }

            try
            {
                var result = await _surveyService.SubmitCorrectionsAsync(
                    userId,
                    parsedSurveyId,
                    request,
                    cancellationToken);

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
