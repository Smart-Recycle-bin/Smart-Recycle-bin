using SmartBin.Common;
using SmartBin.DTOs;
using SmartBin.DTOs.Common;
using SmartBin.Repositories;
using SmartBin.Services.Wallets;

namespace SmartBin.Services
{
    public class CatalogService : ICatalogService
    {
        private readonly IRewardRepository _rewardRepository;
        private readonly IWalletService _walletService;

        public CatalogService(
            IRewardRepository rewardRepository,
            IWalletService walletService)
        {
            _rewardRepository = rewardRepository;
            _walletService = walletService;
        }

        public async Task<(List<CatalogCardDto> Items, PaginationMeta Meta)> BrowseAsync(
            int userId,
            int? categoryId,
            bool affordableOnly,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            if (page < 1)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "page", message = "page must be greater than or equal to 1." } });
            }

            if (pageSize < 1 || pageSize > 100)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "pageSize", message = "pageSize must be between 1 and 100." } });
            }

            if (categoryId.HasValue && categoryId.Value <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid categoryId.",
                    new[] { new { field = "categoryId", message = "categoryId must be a positive integer." } });
            }

            var now = DateTime.UtcNow;
            var rewards = await _rewardRepository.GetActiveCatalogRewardsAsync(categoryId, now, cancellationToken);

            int? available = affordableOnly
                ? await _walletService.GetAvailablePointsAsync(userId, cancellationToken)
                : null;

            var groups = rewards
                .GroupBy(r => r.CategoryId)
                .Select(g => g.OrderBy(r => r.PointsCost).ThenBy(r => r.RewardId).ToList())
                .Where(options => available == null || options.Any(o => o.StockQuantity > 0 && o.PointsCost <= available))
                .Select(options => new
                {
                    Options = options,
                    Pick = options.FirstOrDefault(o => o.StockQuantity > 0) ?? options[0]
                })
                .OrderBy(x => x.Pick.PointsCost)
                .ThenBy(x => x.Pick.CategoryId)
                .ToList();

            var totalItems = groups.Count;
            var cards = groups
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new CatalogCardDto
                {
                    ItemId = x.Pick.RewardId,
                    CategoryId = x.Pick.CategoryId,
                    Brand = x.Pick.Category.Name,
                    Title = x.Pick.Name,
                    LogoUrl = x.Pick.Category.LogoUrl ?? x.Pick.ImageUrl,
                    StartingPointsCost = x.Pick.PointsCost,
                    OptionsCount = x.Options.Count,
                    Status = x.Pick.StockQuantity > 0 ? "in_stock" : "out_of_stock"
                })
                .ToList();

            var meta = new PaginationMeta
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (cards, meta);
        }

        public async Task<CatalogDetailDto> GetDetailAsync(
            int itemId,
            CancellationToken cancellationToken = default)
        {
            if (itemId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid itemId.",
                    new[] { new { field = "itemId", message = "itemId must be a positive integer." } });
            }

            var now = DateTime.UtcNow;
            var item = await _rewardRepository.GetActiveRewardWithCategoryAsync(itemId, now, cancellationToken)
                ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND", "Catalog item not found.");

            var options = await _rewardRepository.GetActiveCategoryOptionsAsync(item.CategoryId, now, cancellationToken);

            return new CatalogDetailDto
            {
                ItemId = item.RewardId,
                CategoryId = item.CategoryId,
                Brand = item.Category.Name,
                Title = item.Name,
                Description = item.Description,
                LogoUrl = item.Category.LogoUrl ?? item.ImageUrl,
                PointsCost = item.PointsCost,
                InStock = item.StockQuantity > 0,
                ValidUntil = item.ValidUntil,
                Options = options
            };
        }
    }
}