using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.DTOs.Wallet;
using SmartBin.Services.Wallets;

namespace SmartBin.Controllers.Wallet
{
    [ApiController]
    [Route("api/v1/admin/ledger")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminLedgerController : ControllerBase
    {
        private readonly IAdminLedgerService _adminLedgerService;

        public AdminLedgerController(IAdminLedgerService adminLedgerService)
        {
            _adminLedgerService = adminLedgerService;
        }

        /// <summary>
        /// E29 — Global immutable admin ledger with filters and SQL pagination
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAdminLedger(
            [FromQuery] int? userId = null,
            [FromQuery] string? from = null,
            [FromQuery] string? to = null,
            [FromQuery] string? type = null,
            [FromQuery] string? source = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = "desc",
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _adminLedgerService.GetAdminLedgerAsync(
                userId,
                from,
                to,
                type,
                source,
                search,
                page,
                pageSize,
                sortBy,
                sortDir,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = items,
                meta
            });
        }

        /// <summary>
        /// E30 — Idempotent atomic manual points credit/debit adjustment
        /// </summary>
        [HttpPost("adjustments")]
        public async Task<IActionResult> ApplyManualAdjustment(
            [FromHeader(Name = "Idempotency-Key")] string? idempotencyKey,
            [FromBody] ManualAdjustmentRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
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

            var (response, isReplay) = await _adminLedgerService.ApplyManualAdjustmentAsync(
                actorAdminId,
                idempotencyKey,
                request,
                cancellationToken);

            if (isReplay)
            {
                return Ok(new
                {
                    success = true,
                    data = response
                });
            }

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                data = response
            });
        }
    }
}
