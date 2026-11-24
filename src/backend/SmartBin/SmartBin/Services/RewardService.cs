using Microsoft.EntityFrameworkCore;
using SmartBin.DTOs;
using SmartBin.Repositories;
using SmartBin.Models;

namespace SmartBin.Services
{
    public class RewardService : IRewardService
    {
        private readonly IRewardRepository _rewardRepository;
        private readonly IRewardCategoryRepository _categoryRepository;

        public RewardService(
            IRewardRepository rewardRepository,
            IRewardCategoryRepository categoryRepository)
        {
            _rewardRepository = rewardRepository;
            _categoryRepository = categoryRepository;
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
            var query = _rewardRepository.Query();

            if (categoryId.HasValue)
            {
                query = query.Where(r => r.CategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(r =>
                    r.Name.Contains(search));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = status.ToLower() switch
                {
                    "archived" => query.Where(r => !r.IsActive),
                    "in_stock" => query.Where(r => r.IsActive && r.StockQuantity > 0),
                    "out_of_stock" => query.Where(r => r.IsActive && r.StockQuantity == 0),
                    _ => query
                };
            }

            query = sortBy?.ToLower() switch
            {
                "title" => sortDir?.ToLower() == "desc"
                    ? query.OrderByDescending(r => r.Name)
                    : query.OrderBy(r => r.Name),

                "pointscost" => sortDir?.ToLower() == "desc"
                    ? query.OrderByDescending(r => r.PointsCost)
                    : query.OrderBy(r => r.PointsCost),

                "stock" => sortDir?.ToLower() == "desc"
                    ? query.OrderByDescending(r => r.StockQuantity)
                    : query.OrderBy(r => r.StockQuantity),

                _ => query.OrderBy(r => r.RewardId)
            };

            var totalItems = await query.CountAsync();

            var rewards = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = rewards.Select(r => new RewardResponseDto
            {
                ItemId = r.RewardId,
                Title = r.Name,
                Description = r.Description,
                CategoryId = r.CategoryId,
                CategoryName = r.Category.Name,
                VoucherCodeType = r.VoucherCodeType,
                PointsCost = r.PointsCost,
                Stock = r.StockQuantity,
                RedemptionsCount = 0,
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

            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = reward.Category.Name,
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

        public async Task<RewardResponseDto> CreateAsync(CreateRewardRequestDto request)
        {
            var category = await _categoryRepository
                .GetByIdAsync(request.CategoryId);

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
            await _rewardRepository.SaveChangesAsync();

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
            await _rewardRepository.SaveChangesAsync();

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
            await _rewardRepository.SaveChangesAsync();

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

            // Check if parent category is active
            var category = await _categoryRepository.GetByIdAsync(reward.CategoryId);
            if (category == null || !category.IsActive)
            {
                return UnarchiveRewardResult.CategoryArchived;
            }

            reward.IsActive = true;

            _rewardRepository.Update(reward);
            await _rewardRepository.SaveChangesAsync();

            return UnarchiveRewardResult.Success;
        }

        public async Task<bool> DecrementStockAsync(int rewardId, int quantity = 1)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);
            if (reward == null || !reward.IsActive || reward.StockQuantity < quantity)
            {
                return false;
            }

            reward.StockQuantity -= quantity;
            _rewardRepository.Update(reward);
            await _rewardRepository.SaveChangesAsync();
            return true;
        }
    }
}
