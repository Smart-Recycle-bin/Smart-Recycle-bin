using EcoBin.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace depi_project.Controllers
{
    [Route("api/v1/catalog")]
    [Authorize(Roles = EcoBin.Api.RoleNames.Citizen)]
    public class CatalogController(ICatalogService catalog, IVoucherService vouchers) : ApiControllerBase
    {
        // E41
        [HttpGet]
        public async Task<IActionResult> Browse([FromQuery] int? categoryId, [FromQuery] bool affordableOnly = false,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
        {
            (page, pageSize) = ApiResponse.Normalize(page, pageSize);
            var (items, total) = await catalog.BrowseAsync(UserId, categoryId, affordableOnly, page, pageSize, ct);
            return Ok(ApiResponse.Paged(items, page, pageSize, total));
        }

        // E45
        [HttpGet("{itemId:int}")]
        public async Task<IActionResult> Detail(int itemId, CancellationToken ct) =>
            Ok(ApiResponse.Ok(await catalog.GetDetailAsync(itemId, ct)));

        // E42
        [HttpPost("{itemId:int}/redemptions")]
        public async Task<IActionResult> Redeem(int itemId, CancellationToken ct) =>
            StatusCode(201, ApiResponse.Ok(await vouchers.RedeemAsync(UserId, itemId, ct)));
    }
}
