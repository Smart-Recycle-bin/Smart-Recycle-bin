using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using SmartBin.Common.Swagger;
using SmartBin.DTOs;
using SmartBin.DTOs.Common;
using SmartBin.Services;

namespace SmartBin.Controllers
{
    public class RedeemRewardRequestDto
    {
        /// <summary>
        /// The EGP denomination tier selected (10, 20, or 50).
        /// The server computes the points cost from the database — never trust the client for this.
        /// </summary>
        public int DenominationEgp { get; set; } = 10;
    }

    [ApiController]
    [Route("api/v1/catalog")]
    [Authorize]
    public class CatalogController : ControllerBase
    {
        private readonly IRewardService _rewardService;

        public CatalogController(IRewardService rewardService)
        {
            _rewardService = rewardService;
        }

        private static bool TryParseItemId(string raw, out int id)
        {
            var clean = raw.Replace("cat-", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("item-", "", StringComparison.OrdinalIgnoreCase)
                           .Replace("rw-", "", StringComparison.OrdinalIgnoreCase);
            return int.TryParse(clean, out id);
        }

        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status500InternalServerError)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogListSuccess)]
        [SwaggerResponseExample(StatusCodes.Status500InternalServerError, SwaggerExamples.ServerError)]
        public async Task<IActionResult> GetCatalog()
        {
            try
            {
                var (items, _) = await _rewardService.GetAllAsync(
                    categoryId: null,
                    status: "active",
                    search: null,
                    page: 1,
                    pageSize: 50,
                    sortBy: null,
                    sortDir: null);

                var catalogList = items.Select(r => new
                {
                    itemId = r.ItemId.ToString(),
                    brand = r.CategoryName,
                    title = r.Title,
                    description = r.Description ?? "Digital reward voucher redeemable with points.",
                    logoUrl = r.ImageUrl ?? "assets/images/placeholder_reward.png",
                    imageUrl = r.ImageUrl,
                    pointsCost = r.PointsCost,
                    defaultPointsCost = r.PointsCost,
                    status = r.Stock > 0 ? "in_stock" : "out_of_stock",
                    stock = r.Stock,
                    denominations = new[]
                    {
                        new { valueEgp = 10, pointsCost = r.PointsCost },
                        new { valueEgp = 20, pointsCost = r.PointsCost * 2 },
                        new { valueEgp = 50, pointsCost = r.PointsCost * 5 }
                    }
                }).ToList();

                return Ok(new
                {
                    success = true,
                    data = catalogList
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = new { code = "SERVER_ERROR", message = ex.Message }
                });
            }
        }

        [HttpGet("featured")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogFeaturedSuccess)]
        public async Task<IActionResult> GetSpotlightBanners()
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

        [HttpGet("{itemId}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogItemDetailsSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        public async Task<IActionResult> GetItemDetails([FromRoute] string itemId)
        {
            if (!TryParseItemId(itemId, out int id))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid item ID." }
                });
            }

            var reward = await _rewardService.GetByIdAsync(id);
            if (reward == null)
            {
                return NotFound(new
                {
                    success = false,
                    error = new { code = "NOT_FOUND", message = "Reward item not found." }
                });
            }

            return Ok(new
            {
                success = true,
                data = new
                {
                    itemId = reward.ItemId.ToString(),
                    brand = reward.CategoryName,
                    title = reward.Title,
                    description = reward.Description ?? "Digital reward voucher redeemable with points.",
                    logoUrl = reward.ImageUrl ?? "assets/images/placeholder_reward.png",
                    imageUrl = reward.ImageUrl,
                    pointsCost = reward.PointsCost,
                    defaultPointsCost = reward.PointsCost,
                    status = reward.Stock > 0 ? "in_stock" : "out_of_stock",
                    stock = reward.Stock,
                    denominations = new[]
                    {
                        new { valueEgp = 10, pointsCost = reward.PointsCost },
                        new { valueEgp = 20, pointsCost = reward.PointsCost * 2 },
                        new { valueEgp = 50, pointsCost = reward.PointsCost * 5 }
                    }
                }
            });
        }

        [HttpPost("{itemId}/redemptions")]
        [Authorize(Roles = "USER_CITIZEN")]
        [ProducesResponseType(typeof(ApiResponse<RedeemRewardResultDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status403Forbidden)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.CatalogRedeemSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.CatalogRedeemBadRequest)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.CatalogRedeemConflict)]
        public async Task<IActionResult> RedeemReward(
            [FromRoute] string itemId,
            [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] RedeemRewardRequestDto? request,
            CancellationToken cancellationToken)
        {
            var rawUserId = User.FindFirstValue("id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(rawUserId, out int userId))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
                });
            }

            if (!TryParseItemId(itemId, out int id))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new { code = "VALIDATION_ERROR", message = "Invalid item ID." }
                });
            }

            try
            {
                var result = await _rewardService.RedeemRewardAsync(
                    userId,
                    id,
                    request?.DenominationEgp ?? 10,
                    cancellationToken);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        voucherCode = result.VoucherCode,
                        pointsDeducted = result.PointsDeducted,
                        newAvailablePoints = result.NewAvailablePoints
                    }
                });
            }
            catch (ApiException ex)
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
}
