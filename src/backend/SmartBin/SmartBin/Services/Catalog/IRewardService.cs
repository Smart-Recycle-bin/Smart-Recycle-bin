using SmartBin.DTOs;

namespace SmartBin.Services
{
    public enum ArchiveRewardResult
    {
        NotFound,
        AlreadyArchived,
        Archived
    }

    public enum UnarchiveRewardResult
    {
        NotFound,
        NotArchived,
        CategoryArchived,
        Success
    }

    public interface IRewardService
    {
        Task<(List<RewardResponseDto> Items, int TotalItems)> GetAllAsync(
            int? categoryId,
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir
        );

        Task<RewardResponseDto?> GetByIdAsync(int rewardId);

        Task<RewardResponseDto> CreateAsync(
            CreateRewardRequestDto request,
            int actorAdminId,
            CancellationToken cancellationToken = default);

        Task<RewardResponseDto?> UpdateAsync(
            int rewardId,
            UpdateRewardRequestDto request,
            int actorAdminId,
            CancellationToken cancellationToken = default);

        Task<ArchiveRewardResult> ArchiveAsync(
            int rewardId,
            int actorAdminId,
            CancellationToken cancellationToken = default);

        Task<UnarchiveRewardResult> UnarchiveAsync(int rewardId);

        Task<bool> DecrementStockAsync(int rewardId, int quantity = 1);

        Task<RedeemRewardResultDto> RedeemRewardAsync(
            int userId,
            int rewardId,
            int? pointsCost,
            CancellationToken cancellationToken = default
        );
    }
}
