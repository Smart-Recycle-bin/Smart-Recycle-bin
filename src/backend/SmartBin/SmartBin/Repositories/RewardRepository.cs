
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
        public IQueryable<Reward> Query()
        {
            return _context.Rewards
                .Include(r => r.Category);
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
