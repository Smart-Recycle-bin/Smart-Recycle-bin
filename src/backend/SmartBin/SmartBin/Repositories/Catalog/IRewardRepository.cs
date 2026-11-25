using SmartBin.Models;

namespace SmartBin.Repositories
{
    public interface IRewardRepository
    {
        Task<Reward?> GetByIdAsync(int rewardId);
        Task<List<Reward>> GetAllAsync();
        Task AddAsync(Reward reward);
        void Update(Reward reward);
        Task<(List<Reward> Items, int TotalItems)> GetAllPagedAsync(
            int? categoryId,
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
        Task<bool> DecrementStockIfAvailableAsync(int rewardId, int quantity, CancellationToken cancellationToken = default);
        Task<bool> HasActiveRewardsInCategoryAsync(int categoryId);
    }
}
