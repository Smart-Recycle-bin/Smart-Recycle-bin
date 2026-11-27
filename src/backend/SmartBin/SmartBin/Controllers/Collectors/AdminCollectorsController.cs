using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.DTOs.Collectors;
using SmartBin.Services.Collectors;

namespace SmartBin.Controllers.Collectors
{
    [ApiController]
    [Route("api/v1/admin/collectors")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminCollectorsController : ControllerBase
    {
        private readonly IAdminCollectorService _adminCollectorService;

        public AdminCollectorsController(IAdminCollectorService adminCollectorService)
        {
            _adminCollectorService = adminCollectorService;
        }

        /// <summary>
        /// E55 — Paginated collector list with search, district, status and sorting
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCollectors(
            [FromQuery] string? search,
            [FromQuery] string? district,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? sortBy = null,
            [FromQuery] string? sortDir = "asc",
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _adminCollectorService.GetCollectorsAsync(
                search,
                district,
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
        /// E56 — Provision a new collector account (OPS_COLLECTOR)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateCollector(
            [FromBody] CreateCollectorRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _adminCollectorService.CreateCollectorAsync(
                actorAdminId,
                request,
                cancellationToken);

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                data = result
            });
        }

        /// <summary>
        /// E57 — Update allowed collector details
        /// </summary>
        [HttpPut("{collectorId:int}")]
        public async Task<IActionResult> UpdateCollector(
            [FromRoute] int collectorId,
            [FromBody] UpdateCollectorRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _adminCollectorService.UpdateCollectorAsync(
                collectorId,
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
        /// E58 — Paginated smart bins assigned to a collector
        /// </summary>
        [HttpGet("{collectorId:int}/bins")]
        public async Task<IActionResult> GetAssignedBins(
            [FromRoute] int collectorId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken cancellationToken = default)
        {
            var (items, meta) = await _adminCollectorService.GetAssignedBinsAsync(
                collectorId,
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

        /// <summary>
        /// E59 — Deactivate an active collector account
        /// </summary>
        [HttpPost("{collectorId:int}/deactivate")]
        public async Task<IActionResult> DeactivateCollector(
            [FromRoute] int collectorId,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _adminCollectorService.DeactivateCollectorAsync(
                collectorId,
                actorAdminId,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        private UnauthorizedObjectResult UnauthorizedError()
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
    }
}
