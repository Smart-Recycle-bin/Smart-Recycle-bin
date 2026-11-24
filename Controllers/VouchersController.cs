using EcoBin.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace depi_project.Controllers;

[Route("api/v1/vouchers")]
[Authorize(Roles = RoleNames.Citizen)]
public class VouchersController(IVoucherService vouchers) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        (page, pageSize) = ApiResponse.Normalize(page, pageSize);
        var (items, total) = await vouchers.ListAsync(UserId, status, page, pageSize, ct);
        return Ok(ApiResponse.Paged(items, page, pageSize, total));
    }
}