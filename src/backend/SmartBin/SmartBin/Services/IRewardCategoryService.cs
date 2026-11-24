using SmartBin.DTOs;

namespace SmartBin.Services
{
    public enum ArchiveCategoryResult
    {
        NotFound,
        AlreadyArchived,
        HasActiveRewards,
        Archived
    }

    public enum UnarchiveCategoryResult
    {
        NotFound,
        NotArchived,
        Success
    }

    public enum UpdateCategoryResult
    {
        NotFound,
        ConflictName,
        ConflictNameArchived,
        Success
    }

    public interface IRewardCategoryService
    {
        Task<List<RewardCategoryResponseDto>> GetActiveAsync();

        Task<RewardCategoryResponseDto> CreateAsync(
            CreateRewardCategoryRequestDto request);

        Task<(UpdateCategoryResult Result, RewardCategoryResponseDto? Category)> UpdateAsync(
            int categoryId,
            UpdateRewardCategoryRequestDto request);

        Task<ArchiveCategoryResult> ArchiveAsync(int categoryId);

        Task<UnarchiveCategoryResult> UnarchiveAsync(int categoryId);
    }
}
