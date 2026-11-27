using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories
{
    public class RewardRepository : IRewardRepository
    {
        private readonly AppDbContext _context;

        public RewardRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Reward?> GetByIdAsync(int rewardId)
        {
            return await _context.Rewards
                .Include(r => r.Category)
                .FirstOrDefaultAsync(r => r.RewardId == rewardId);
        }

        public async Task<List<Reward>> GetAllAsync()
        {
            return await _context.Rewards
                .Include(r => r.Category)
                .ToListAsync();
        }

        public async Task AddAsync(Reward reward)
        {
            await _context.Rewards.AddAsync(reward);
        }

        public void Update(Reward reward)
        {
            _context.Rewards.Update(reward);
        }

        public async Task<(List<RewardResponseDto> Items, int TotalItems)> GetAllPagedAsync(
            int? categoryId,
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var query = _context.Rewards
                .AsNoTracking()
                .AsQueryable();

            if (categoryId.HasValue)
            {
                query = query.Where(r => r.CategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(r =>
                    r.Name.Contains(s) ||
                    (r.Description != null && r.Description.Contains(s)) ||
                    r.Category.Name.Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = status.Trim().ToLower() switch
                {
                    "archived" => query.Where(r => !r.IsActive),
                    "in_stock" => query.Where(r => r.IsActive && r.StockQuantity > 0),
                    "out_of_stock" => query.Where(r => r.IsActive && r.StockQuantity == 0),
                    _ => query
                };
            }

            int totalItems = await query.CountAsync(cancellationToken);

            var projected = query.Select(r => new RewardResponseDto
            {
                ItemId = r.RewardId,
                Title = r.Name,
                Description = r.Description,
                CategoryId = r.CategoryId,
                CategoryName = r.Category.Name,
                VoucherCodeType = r.VoucherCodeType,
                PointsCost = r.PointsCost,
                Stock = r.StockQuantity,
                RedemptionsCount = _context.LedgerTransactions.Count(lt =>
                    lt.Source == LedgerSource.VoucherRedemption &&
                    lt.VoucherId == r.RewardId),
                Status = !r.IsActive
                    ? "archived"
                    : r.StockQuantity > 0
                        ? "in_stock"
                        : "out_of_stock",
                ImageUrl = r.ImageUrl,
                ValidFrom = r.ValidFrom,
                ValidUntil = r.ValidUntil
            });

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);

            IOrderedQueryable<RewardResponseDto> orderedQuery = sortBy?.Trim().ToLowerInvariant() switch
            {
                "title" => isDesc
                    ? projected.OrderByDescending(x => x.Title).ThenByDescending(x => x.ItemId)
                    : projected.OrderBy(x => x.Title).ThenBy(x => x.ItemId),

                "category" => isDesc
                    ? projected.OrderByDescending(x => x.CategoryName).ThenByDescending(x => x.ItemId)
                    : projected.OrderBy(x => x.CategoryName).ThenBy(x => x.ItemId),

                "pointscost" => isDesc
                    ? projected.OrderByDescending(x => x.PointsCost).ThenByDescending(x => x.ItemId)
                    : projected.OrderBy(x => x.PointsCost).ThenBy(x => x.ItemId),

                "stock" => isDesc
                    ? projected.OrderByDescending(x => x.Stock).ThenByDescending(x => x.ItemId)
                    : projected.OrderBy(x => x.Stock).ThenBy(x => x.ItemId),

                "redemptionscount" => isDesc
                    ? projected.OrderByDescending(x => x.RedemptionsCount).ThenByDescending(x => x.ItemId)
                    : projected.OrderBy(x => x.RedemptionsCount).ThenBy(x => x.ItemId),

                "status" => isDesc
                    ? projected.OrderByDescending(x => x.Status).ThenByDescending(x => x.ItemId)
                    : projected.OrderBy(x => x.Status).ThenBy(x => x.ItemId),

                _ => projected.OrderBy(x => x.ItemId)
            };

            var items = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (items, totalItems);
        }

        public async Task<int> GetRedemptionsCountAsync(int rewardId, CancellationToken cancellationToken = default)
        {
            return await _context.LedgerTransactions
                .AsNoTracking()
                .CountAsync(
                    lt => lt.Source == LedgerSource.VoucherRedemption && lt.VoucherId == rewardId,
                    cancellationToken);
        }

        public async Task<bool> DecrementStockIfAvailableAsync(int rewardId, int quantity, CancellationToken cancellationToken = default)
        {
            var updatedRows = await _context.Rewards
                .Where(r => r.RewardId == rewardId && r.StockQuantity >= quantity)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(r => r.StockQuantity, r => r.StockQuantity - quantity),
                    cancellationToken);

            return updatedRows > 0;
        }

        public async Task<int?> GetStockQuantityAsync(int rewardId, CancellationToken cancellationToken = default)
        {
            return await _context.Rewards
                .AsNoTracking()
                .Where(r => r.RewardId == rewardId)
                .Select(r => (int?)r.StockQuantity)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<bool> HasActiveRewardsInCategoryAsync(int categoryId)
        {
            return await _context.Rewards
                .AnyAsync(r => r.CategoryId == categoryId && r.IsActive);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
