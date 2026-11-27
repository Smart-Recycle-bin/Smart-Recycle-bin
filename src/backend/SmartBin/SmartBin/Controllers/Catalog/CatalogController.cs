using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Common.Swagger;
using SmartBin.DTOs;
using SmartBin.DTOs.Common;
using SmartBin.Models.Constants;
using SmartBin.Services;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/catalog")]
    public class CatalogController : ControllerBase
    {
        private readonly ICatalogService _catalogService;
        private readonly IVoucherService _voucherService;

        public CatalogController(
            ICatalogService catalogService,
            IVoucherService voucherService)
        {
            _catalogService = catalogService;
            _voucherService = voucherService;
        }

        [HttpGet]
        [Authorize(Roles = RoleNames.Citizen)]
        [ProducesResponseType(typeof(PagedApiResponse<List<CatalogCardDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogListSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> Browse(
            [FromQuery] int? categoryId,
            [FromQuery] bool affordableOnly = false,
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

            var (items, meta) = await _catalogService.BrowseAsync(
                userId,
                categoryId,
                affordableOnly,
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

        [HttpGet("featured")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogFeaturedSuccess)]
        public IActionResult GetSpotlightBanners()
        {
            var banners = new[]
            {
                new
                {
                    bannerId = "b1",
                    title = "Metro Free Ticket On Your Next Trip",
                    subtitle = "Enjoy a free Metro ride! Claim your free ticket on your next trip now.",
                    imageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600",
                    targetItemId = "1"
                },
                new
                {
                    bannerId = "b2",
                    title = "Double Points on Aluminum Cans",
                    subtitle = "Recycle aluminum cans this week and receive double wallet credits.",
                    imageUrl = "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600",
                    targetItemId = "2"
                }
            };

            return Ok(new
            {
                success = true,
                data = banners
            });
        }

        [HttpGet("{itemId:int}")]
        [Authorize(Roles = RoleNames.Citizen)]
        [ProducesResponseType(typeof(ApiResponse<CatalogDetailDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogItemDetailsSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        public async Task<IActionResult> Detail(
            [FromRoute] int itemId,
            CancellationToken cancellationToken = default)
        {
            var detail = await _catalogService.GetDetailAsync(itemId, cancellationToken);
            return Ok(new
            {
                success = true,
                data = detail
            });
        }

        [HttpPost("{itemId:int}/redemptions")]
        [Authorize(Roles = RoleNames.Citizen)]
        [ProducesResponseType(typeof(ApiResponse<RedemptionResultDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status201Created, SwaggerExamples.CatalogRedeemSuccess)]
        [SwaggerResponseExample(StatusCodes.Status403Forbidden, SwaggerExamples.Forbidden)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.CatalogRedeemConflict)]
        public async Task<IActionResult> Redeem(
            [FromRoute] int itemId,
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

            var result = await _voucherService.RedeemAsync(userId, itemId, cancellationToken);

            return StatusCode(StatusCodes.Status201Created, new
            {
                success = true,
                data = result
            });
        }
    }
}