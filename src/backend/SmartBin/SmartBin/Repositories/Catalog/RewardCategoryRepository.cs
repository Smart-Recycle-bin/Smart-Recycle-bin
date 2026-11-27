
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;

namespace SmartBin.Repositories
{
    public class RewardCategoryRepository : IRewardCategoryRepository
    {
        private readonly AppDbContext _context;

        public RewardCategoryRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<RewardCategory?> GetByIdAsync(int categoryId)
        {
            return await _context.RewardCategories
                .FirstOrDefaultAsync(c => c.CategoryId == categoryId);
        }

        public async Task<List<RewardCategory>> GetAllAsync()
        {
            return await _context.RewardCategories.ToListAsync();
        }

        public async Task<List<RewardCategory>> GetActiveAsync()
        {
            return await _context.RewardCategories
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.CategoryId)
                .ToListAsync();
        }

        public async Task AddAsync(RewardCategory category)
        {
            await _context.RewardCategories.AddAsync(category);
        }

        public void Update(RewardCategory category)
        {
            _context.RewardCategories.Update(category);
        }
    }
}
