using SmartBin.DTOs;

namespace SmartBin.Services
{
    public interface IRewardCategoryService
    {
        Task<List<RewardCategoryResponseDto>> GetActiveAsync();

        Task<RewardCategoryResponseDto> CreateAsync(
            CreateRewardCategoryRequestDto request);
    }
}
