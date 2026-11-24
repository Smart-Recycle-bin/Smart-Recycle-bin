using SmartBin.DTOs;
using SmartBin.Repositories;
using SmartBin.Models;

namespace SmartBin.Services
{
    public class RewardCategoryService : IRewardCategoryService
    {
        private readonly IRewardCategoryRepository _categoryRepository;
        private readonly IRewardRepository _rewardRepository;

        public RewardCategoryService(
            IRewardCategoryRepository categoryRepository,
            IRewardRepository rewardRepository)
        {
            _categoryRepository = categoryRepository;
            _rewardRepository = rewardRepository;
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

            var trimmedName = request.Name.Trim();
            var existingCategory = categories.FirstOrDefault(c =>
                c.Name.Equals(
                    trimmedName,
                    StringComparison.OrdinalIgnoreCase));

            if (existingCategory != null)
            {
                if (!existingCategory.IsActive)
                {
                    throw new InvalidOperationException(
                        $"A category with the name '{existingCategory.Name}' already exists in the archive (ID: {existingCategory.CategoryId}). You can unarchive it using: POST /api/v1/admin/catalog/categories/{existingCategory.CategoryId}/unarchive");
                }

                throw new ArgumentException(
                    "A category with this name already exists.");
            }

            var category = new RewardCategory
            {
                Name = trimmedName,
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

        public async Task<(UpdateCategoryResult Result, RewardCategoryResponseDto? Category)> UpdateAsync(
            int categoryId,
            UpdateRewardCategoryRequestDto request)
        {
            var category = await _categoryRepository.GetByIdAsync(categoryId);
            if (category == null)
            {
                return (UpdateCategoryResult.NotFound, null);
            }

            var allCategories = await _categoryRepository.GetAllAsync();
            var nameTrimmed = request.Name.Trim();
            var duplicateCategory = allCategories.FirstOrDefault(c =>
                c.CategoryId != categoryId &&
                c.Name.Equals(nameTrimmed, StringComparison.OrdinalIgnoreCase));

            if (duplicateCategory != null)
            {
                if (!duplicateCategory.IsActive)
                {
                    return (UpdateCategoryResult.ConflictNameArchived, null);
                }
                return (UpdateCategoryResult.ConflictName, null);
            }

            category.Name = nameTrimmed;
            category.LogoUrl = request.LogoUrl;
            category.UpdatedAt = DateTime.UtcNow;

            _categoryRepository.Update(category);
            await _categoryRepository.SaveChangesAsync();

            return (UpdateCategoryResult.Success, new RewardCategoryResponseDto
            {
                CategoryId = category.CategoryId,
                Name = category.Name,
                Status = category.IsActive ? "active" : "archived",
                LogoUrl = category.LogoUrl
            });
        }

        public async Task<ArchiveCategoryResult> ArchiveAsync(int categoryId)
        {
            var category = await _categoryRepository.GetByIdAsync(categoryId);
            if (category == null)
            {
                return ArchiveCategoryResult.NotFound;
            }

            if (!category.IsActive)
            {
                return ArchiveCategoryResult.AlreadyArchived;
            }

            // Acceptance criteria: prevent archive if any active reward is associated with this category
            bool hasActiveRewards = await _rewardRepository.HasActiveRewardsInCategoryAsync(categoryId);
            if (hasActiveRewards)
            {
                return ArchiveCategoryResult.HasActiveRewards;
            }

            category.IsActive = false;
            category.UpdatedAt = DateTime.UtcNow;

            _categoryRepository.Update(category);
            await _categoryRepository.SaveChangesAsync();

            return ArchiveCategoryResult.Archived;
        }

        public async Task<UnarchiveCategoryResult> UnarchiveAsync(int categoryId)
        {
            var category = await _categoryRepository.GetByIdAsync(categoryId);
            if (category == null)
            {
                return UnarchiveCategoryResult.NotFound;
            }

            if (category.IsActive)
            {
                return UnarchiveCategoryResult.NotArchived;
            }

            category.IsActive = true;
            category.UpdatedAt = DateTime.UtcNow;

            _categoryRepository.Update(category);
            await _categoryRepository.SaveChangesAsync();

            return UnarchiveCategoryResult.Success;
        }
    }
}
