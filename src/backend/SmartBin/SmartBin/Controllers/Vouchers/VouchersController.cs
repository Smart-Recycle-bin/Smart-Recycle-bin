using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Common.Swagger;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Vouchers;
using SmartBin.Models.Constants;
using SmartBin.Services;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/vouchers")]
    [Authorize(Roles = RoleNames.Citizen)]
    public class VouchersController : ControllerBase
    {
        private readonly IVoucherService _voucherService;

        public VouchersController(IVoucherService voucherService)
        {
            _voucherService = voucherService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(PagedApiResponse<List<VoucherItemDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.VouchersListSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> List(
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out int userId))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
                });
            }

            var (items, meta) = await _voucherService.ListAsync(
                userId,
                status,
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
    }
}