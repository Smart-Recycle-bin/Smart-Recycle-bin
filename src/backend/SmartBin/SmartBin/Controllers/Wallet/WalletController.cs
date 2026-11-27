using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common.Swagger;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Wallet;
using SmartBin.Services;
using SmartBin.Services.Wallets;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/wallet")]
    [Authorize(Roles = "USER_CITIZEN")]
    public class WalletController : ControllerBase
    {
        private readonly IWalletService _walletService;

        public WalletController(IWalletService walletService)
        {
            _walletService = walletService;
        }

        [HttpGet("balance")]
        [ProducesResponseType(typeof(ApiResponse<WalletBalanceResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.WalletBalanceSuccess)]
        public async Task<IActionResult> GetBalance(CancellationToken cancellationToken)
        {
            if (!TryGetCurrentUserId(out int userId))
            {
                return UnauthorizedError();
            }

            try
            {
                var result = await _walletService.GetBalanceAsync(userId, cancellationToken);
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

        [HttpGet("ledger")]
        [ProducesResponseType(typeof(PagedApiResponse<List<LedgerEntryDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.WalletLedgerSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> GetLedger(
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
                var (items, meta) = await _walletService.GetLedgerAsync(
                    userId,
                    page,
                    pageSize,
                    cancellationToken);

                return Ok(new
                {
                    success = true,
                    data = items,
                    meta
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
