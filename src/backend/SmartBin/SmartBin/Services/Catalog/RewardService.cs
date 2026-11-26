using SmartBin.DTOs;
using SmartBin.Models;
using SmartBin.Repositories;

namespace SmartBin.Services
{
    public class RewardService : IRewardService
    {
        private readonly IRewardRepository _rewardRepository;
        private readonly IRewardCategoryRepository _categoryRepository;
        private readonly IVoucherRepository _voucherRepository;
        private readonly IUnitOfWork _unitOfWork;

        public RewardService(
            IRewardRepository rewardRepository,
            IRewardCategoryRepository categoryRepository,
            IVoucherRepository voucherRepository,
            IUnitOfWork unitOfWork)
        {
            _rewardRepository = rewardRepository;
            _categoryRepository = categoryRepository;
            _voucherRepository = voucherRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<(List<RewardResponseDto> Items, int TotalItems)> GetAllAsync(
            int? categoryId,
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir)
        {
            var (rewards, totalItems) = await _rewardRepository.GetAllPagedAsync(
                categoryId,
                status,
                search,
                page,
                pageSize,
                sortBy,
                sortDir);

            var counts = await _voucherRepository.GetRedemptionCountsByRewardIdsAsync(
                rewards.Select(r => r.RewardId));

            var items = rewards.Select(r => new RewardResponseDto
            {
                ItemId = r.RewardId,
                Title = r.Name,
                Description = r.Description,
                CategoryId = r.CategoryId,
                CategoryName = r.Category?.Name ?? string.Empty,
                VoucherCodeType = r.VoucherCodeType,
                PointsCost = r.PointsCost,
                Stock = r.StockQuantity,
                RedemptionsCount = counts.GetValueOrDefault(r.RewardId, 0),
                Status = !r.IsActive
                    ? "archived"
                    : r.StockQuantity > 0
                      ? "in_stock"
                      : "out_of_stock",
                ImageUrl = r.ImageUrl,
                ValidFrom = r.ValidFrom,
                ValidUntil = r.ValidUntil
            }).ToList();

            return (items, totalItems);
        }

        public async Task<RewardResponseDto?> GetByIdAsync(int rewardId)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return null;
            }

            var redemptionsCount = await _voucherRepository.GetRedemptionCountByRewardIdAsync(rewardId);

            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = reward.Category?.Name ?? string.Empty,
                VoucherCodeType = reward.VoucherCodeType,
                PointsCost = reward.PointsCost,
                Stock = reward.StockQuantity,
                RedemptionsCount = redemptionsCount,
                Status = !reward.IsActive
                  ? "archived"
                  : reward.StockQuantity > 0
                     ? "in_stock"
                     : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = reward.ValidFrom,
                ValidUntil = reward.ValidUntil
            };
        }

        public async Task<RewardResponseDto> CreateAsync(CreateRewardRequestDto request)
        {
            var category = await _categoryRepository.GetByIdAsync(request.CategoryId);

            if (category == null)
            {
                throw new ArgumentException("Category not found.");
            }

            var reward = new Reward
            {
                Name = request.Title,
                Description = request.Description,
                CategoryId = request.CategoryId,
                VoucherCodeType = request.VoucherCodeType,
                PointsCost = request.PointsCost,
                StockQuantity = request.Stock,
                ImageUrl = request.ImageUrl,
                ValidFrom = request.ValidFrom,
                ValidUntil = request.ValidUntil,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _rewardRepository.AddAsync(reward);
            await _unitOfWork.SaveChangesAsync();

            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = category.Name,
                VoucherCodeType = reward.VoucherCodeType,
                PointsCost = reward.PointsCost,
                Stock = reward.StockQuantity,
                RedemptionsCount = 0,
                Status = !reward.IsActive
                 ? "archived"
                 : reward.StockQuantity > 0
                     ? "in_stock"
                     : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = reward.ValidFrom,
                ValidUntil = reward.ValidUntil
            };
        }

        public async Task<RewardResponseDto?> UpdateAsync(
            int rewardId,
            UpdateRewardRequestDto request)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return null;
            }

            string categoryName = reward.Category?.Name ?? string.Empty;

            if (request.CategoryId.HasValue)
            {
                var category = await _categoryRepository.GetByIdAsync(request.CategoryId.Value);
                if (category == null)
                {
                    throw new ArgumentException("Category not found.");
                }
                reward.CategoryId = request.CategoryId.Value;
                categoryName = category.Name;
            }

            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                reward.Name = request.Title.Trim();
            }

            if (request.Description != null)
            {
                reward.Description = request.Description;
            }

            if (request.VoucherCodeType != null)
            {
                reward.VoucherCodeType = request.VoucherCodeType;
            }

            if (request.PointsCost.HasValue)
            {
                reward.PointsCost = request.PointsCost.Value;
            }

            if (request.Stock.HasValue)
            {
                reward.StockQuantity = request.Stock.Value;
            }

            if (request.ImageUrl != null)
            {
                reward.ImageUrl = request.ImageUrl;
            }

            if (request.ValidFrom.HasValue)
            {
                reward.ValidFrom = request.ValidFrom.Value;
            }

            if (request.ValidUntil.HasValue)
            {
                reward.ValidUntil = request.ValidUntil.Value;
            }

            _rewardRepository.Update(reward);
            await _unitOfWork.SaveChangesAsync();

            var redemptionsCount = await _voucherRepository.GetRedemptionCountByRewardIdAsync(rewardId);

            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = categoryName,
                VoucherCodeType = reward.VoucherCodeType,
                PointsCost = reward.PointsCost,
                Stock = reward.StockQuantity,
                RedemptionsCount = redemptionsCount,
                Status = !reward.IsActive
                   ? "archived"
                   : reward.StockQuantity > 0
                       ? "in_stock"
                       : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = reward.ValidFrom,
                ValidUntil = reward.ValidUntil
            };
        }

        public async Task<ArchiveRewardResult> ArchiveAsync(int rewardId)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return ArchiveRewardResult.NotFound;
            }

            if (!reward.IsActive)
            {
                return ArchiveRewardResult.AlreadyArchived;
            }

            reward.IsActive = false;

            _rewardRepository.Update(reward);
            await _unitOfWork.SaveChangesAsync();

            return ArchiveRewardResult.Archived;
        }

        public async Task<UnarchiveRewardResult> UnarchiveAsync(int rewardId)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return UnarchiveRewardResult.NotFound;
            }

            if (reward.IsActive)
            {
                return UnarchiveRewardResult.NotArchived;
            }

            var category = await _categoryRepository.GetByIdAsync(reward.CategoryId);
            if (category == null || !category.IsActive)
            {
                return UnarchiveRewardResult.CategoryArchived;
            }

            reward.IsActive = true;

            _rewardRepository.Update(reward);
            await _unitOfWork.SaveChangesAsync();

            return UnarchiveRewardResult.Success;
        }

        public Task<bool> DecrementStockAsync(int rewardId, int quantity = 1, CancellationToken cancellationToken = default)
        {
            return _rewardRepository.DecrementStockIfAvailableAsync(rewardId, quantity, cancellationToken);
        }
    }
}