using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartBin.Common;
using SmartBin.DTOs.Users;
using SmartBin.Services.Users;

namespace SmartBin.Controllers.Users
{
    [ApiController]
    [Route("api/v1/admin/users")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminUsersController : ControllerBase
    {
        private readonly IAdminUserService _adminUserService;

        public AdminUsersController(IAdminUserService adminUserService)
        {
            _adminUserService = adminUserService;
        }

        /// <summary>
        /// E14 — Paginated recycler list restricted to USER_CITIZEN
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRecyclers(
            [FromQuery] string? role,
            [FromQuery] string? query,
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = "asc",
            CancellationToken cancellationToken = default)
        {
            var effectiveSearch = !string.IsNullOrWhiteSpace(query) ? query : search;

            var (items, meta) = await _adminUserService.GetRecyclersAsync(
                role,
                effectiveSearch,
                status,
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
        /// E16 — Suspend an eligible citizen recycler account
        /// </summary>
        [HttpPost("{userId:int}/suspend")]
        public async Task<IActionResult> SuspendRecycler(
            [FromRoute] int userId,
            [FromBody] SuspendUserRequestDto request,
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

            var result = await _adminUserService.SuspendRecyclerAsync(
                userId,
                actorAdminId,
                request,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        /// <summary>
        /// E17 — Unsuspend a currently suspended citizen recycler account
        /// </summary>
        [HttpPost("{userId:int}/unsuspend")]
        public async Task<IActionResult> UnsuspendRecycler(
            [FromRoute] int userId,
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] UnsuspendUserRequestDto? request = null,
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

            var result = await _adminUserService.UnsuspendRecyclerAsync(
                userId,
                actorAdminId,
                request,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }
    }
}
