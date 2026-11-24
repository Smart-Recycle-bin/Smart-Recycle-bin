using SmartBin.DTOs;
using SmartBin.Repositories;
using SmartBin.Models;

namespace SmartBin.Services
{
    public class RewardCategoryService : IRewardCategoryService
    {
        private readonly IRewardCategoryRepository _categoryRepository;

        public RewardCategoryService(
            IRewardCategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        public async Task<List<RewardCategoryResponseDto>> GetActiveAsync()
        {
            var categories = await _categoryRepository.GetActiveAsync();

            return categories.Select(category => new RewardCategoryResponseDto
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Status = category.IsActive ? "active" : "archived",
                LogoUrl = category.LogoUrl
            }).ToList();
        }

        public async Task<RewardCategoryResponseDto> CreateAsync(
            CreateRewardCategoryRequestDto request)
        {
            var categories = await _categoryRepository.GetAllAsync();

            bool nameExists = categories.Any(c =>
                c.Name.Equals(
                    request.Name.Trim(),
                    StringComparison.OrdinalIgnoreCase));

            if (nameExists)
            {
                throw new ArgumentException(
                    "A category with this name already exists.");
            }

            var category = new RewardCategory
            {
                Name = request.Name.Trim(),
                LogoUrl = request.LogoUrl,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _categoryRepository.AddAsync(category);
            await _categoryRepository.SaveChangesAsync();

            return new RewardCategoryResponseDto
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Status = "active",
                LogoUrl = category.LogoUrl
            };
        }
    }
}
