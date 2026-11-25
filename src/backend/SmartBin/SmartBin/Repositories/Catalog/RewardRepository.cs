using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;

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

        public async Task<(List<Reward> Items, int TotalItems)> GetAllPagedAsync(
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
                .Include(r => r.Category)
                .AsQueryable();

            if (categoryId.HasValue)
            {
                query = query.Where(r => r.CategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(r => r.Name.Contains(search));
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

            var totalItems = await query.CountAsync(cancellationToken);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (items, totalItems);
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
