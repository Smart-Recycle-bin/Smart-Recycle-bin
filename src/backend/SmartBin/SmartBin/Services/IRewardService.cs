
using SmartBin.DTOs;

namespace SmartBin.Services
{
    public enum ArchiveRewardResult
    {
        NotFound,
        AlreadyArchived,
        Archived
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

        Task<RewardResponseDto> CreateAsync(CreateRewardRequestDto request);

        Task<RewardResponseDto?> UpdateAsync(
            int rewardId,
            UpdateRewardRequestDto request
        );

        Task<ArchiveRewardResult> ArchiveAsync(int rewardId);

    }
}
