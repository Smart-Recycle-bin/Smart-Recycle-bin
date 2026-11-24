using System.Threading;
using System.Threading.Tasks;
using EcoBin.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace depi_project.Controllers;

[Route("api/v1/admin/inspections")]
[Authorize(Roles = RoleNames.Admin)]
public class AdminInspectionsController(IInspectionService inspections) : ApiControllerBase
{
    // E65
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] string? sortBy, [FromQuery] string? sortDir, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        (page, pageSize) = ApiResponse.Normalize(page, pageSize);
        var r = await inspections.ListAsync(status, search, sortBy, sortDir, page, pageSize, ct);
        return Ok(ApiResponse.Paged(r.Items, page, pageSize, r.Total, r.Summary));
    }

    // E67
    [HttpGet("{reportId:int}")]
    public async Task<IActionResult> Get(int reportId, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await inspections.GetAsync(reportId, ct)));

    // E68
    [HttpPost("{reportId:int}/correct")]
    public async Task<IActionResult> Correct(int reportId, [FromBody] CorrectRequest body, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await inspections.CorrectAsync(UserId, reportId, body.WasteTypeId, ct)));

    // E69
    [HttpPost("{reportId:int}/dismiss")]
    public async Task<IActionResult> Dismiss(int reportId, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await inspections.DismissAsync(UserId, reportId, ct)));

    // E70
    [HttpPost("{reportId:int}/retrain")]
    public async Task<IActionResult> Retrain(int reportId, CancellationToken ct) =>
        Ok(ApiResponse.Ok(await inspections.RetrainAsync(UserId, reportId, ct)));
}