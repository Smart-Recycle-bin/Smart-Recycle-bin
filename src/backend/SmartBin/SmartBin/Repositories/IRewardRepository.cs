
using SmartBin.Models;

namespace SmartBin.Repositories
{
    public interface IRewardRepository
    {
        Task<Reward?> GetByIdAsync(int rewardId);
        Task<List<Reward>> GetAllAsync();
        Task AddAsync(Reward reward);
        void Update(Reward reward);
        Task SaveChangesAsync();

        IQueryable<Reward> Query();
        Task<bool> HasActiveRewardsInCategoryAsync(int categoryId);
    }
}