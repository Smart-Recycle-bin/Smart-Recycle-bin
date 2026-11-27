using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Services.Lookups;

namespace SmartBin.Controllers.Lookups
{
    [ApiController]
    [Route("api/v1/admin/lookups")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminLookupsController : ControllerBase
    {
        private readonly IAdminLookupService _lookupService;

        public AdminLookupsController(IAdminLookupService lookupService)
        {
            _lookupService = lookupService;
        }

        /// <summary>
        /// E78 — System admin lookup options
        /// </summary>
        [HttpGet("admins")]
        public async Task<IActionResult> GetAdmins(CancellationToken cancellationToken = default)
        {
            var items = await _lookupService.GetAdminsAsync(cancellationToken);
            return Ok(new
            {
                success = true,
                data = items
            });
        }

        /// <summary>
        /// E79 — Active collector lookup options
        /// </summary>
        [HttpGet("collectors")]
        public async Task<IActionResult> GetCollectors(CancellationToken cancellationToken = default)
        {
            var items = await _lookupService.GetCollectorsAsync(cancellationToken);
            return Ok(new
            {
                success = true,
                data = items
            });
        }

        /// <summary>
        /// E80 — Distinct districts derived from persisted bins and collector records
        /// </summary>
        [HttpGet("districts")]
        public async Task<IActionResult> GetDistricts(CancellationToken cancellationToken = default)
        {
            var items = await _lookupService.GetDistrictsAsync(cancellationToken);
            return Ok(new
            {
                success = true,
                data = items
            });
        }
    }
}
