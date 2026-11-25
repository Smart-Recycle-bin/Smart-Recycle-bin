using SmartBin.Models;

namespace SmartBin.Repositories
{
    public interface IRewardCategoryRepository
    {
        Task<RewardCategory?> GetByIdAsync(int categoryId);

        Task<List<RewardCategory>> GetAllAsync();

        Task<List<RewardCategory>> GetActiveAsync();

        Task AddAsync(RewardCategory category);

        void Update(RewardCategory category);
    }
}