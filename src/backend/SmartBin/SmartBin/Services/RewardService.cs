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

            var category = await _categoryRepository.GetByIdAsync(request.CategoryId);

            if (category == null)
            {
                throw new ArgumentException("Category not found.");
            }

            reward.Name = request.Title;
            reward.Description = request.Description;
            reward.CategoryId = request.CategoryId;
            reward.VoucherCodeType = request.VoucherCodeType;
            reward.PointsCost = request.PointsCost;
            reward.StockQuantity = request.Stock;
            reward.ImageUrl = request.ImageUrl;
            reward.ValidFrom = request.ValidFrom;
            reward.ValidUntil = request.ValidUntil;

            _rewardRepository.Update(reward);
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


    }
}