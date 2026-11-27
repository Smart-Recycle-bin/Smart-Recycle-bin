using System.Globalization;
using Microsoft.EntityFrameworkCore;
using SmartBin.DTOs;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Services.Audit;
using SmartBin.Services.Notifications;
using SmartBin.Services.Wallets;

namespace SmartBin.Services
{
    public class RewardService : IRewardService
    {
        private readonly IRewardRepository _rewardRepository;
        private readonly IRewardCategoryRepository _categoryRepository;
        private readonly IWalletService _walletService;
        private readonly IAuditLogService _auditLogService;
        private readonly IAdminNotificationService _notificationService;
        private readonly IUnitOfWork _unitOfWork;

        public RewardService(
            IRewardRepository rewardRepository,
            IRewardCategoryRepository categoryRepository,
            IWalletService walletService,
            IAuditLogService auditLogService,
            IAdminNotificationService notificationService,
            IUnitOfWork unitOfWork)
        {
            _rewardRepository = rewardRepository;
            _categoryRepository = categoryRepository;
            _walletService = walletService;
            _auditLogService = auditLogService;
            _notificationService = notificationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<(List<RewardResponseDto> Items, int TotalItems)> GetAllAsync(
            int? categoryId,
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir)
        {
            var (items, totalItems) = await _rewardRepository.GetAllPagedAsync(
                categoryId,
                status,
                search,
                page,
                pageSize,
                sortBy,
                sortDir);

            foreach (var item in items)
            {
                item.ValidFrom = EnsureUtcNullable(item.ValidFrom);
                item.ValidUntil = EnsureUtcNullable(item.ValidUntil);
            }

            return (items, totalItems);
        }

        public async Task<RewardResponseDto?> GetByIdAsync(int rewardId)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return null;
            }

            var redemptionsCount = await _rewardRepository.GetRedemptionsCountAsync(reward.RewardId);
            return MapToDto(reward, reward.Category?.Name ?? string.Empty, redemptionsCount);
        }

        public async Task<RewardResponseDto> CreateAsync(
            CreateRewardRequestDto request,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            var title = request.Title?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(title))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Title is required.",
                    new[] { new { field = "title", message = "Title is required." } });
            }

            var categoryId = request.CategoryId!.Value;
            var category = await _categoryRepository.GetByIdAsync(categoryId);

            if (category == null || !category.IsActive)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "The specified category does not exist or is archived.",
                    new[] { new { field = "categoryId", message = "The specified category does not exist or is archived." } });
            }

            var voucherCodeType = NormalizeAndValidateVoucherCodeType(request.VoucherCodeType);
            var validFrom = EnsureUtcNullable(request.ValidFrom);
            var validUntil = EnsureUtcNullable(request.ValidUntil);
            ValidateValidityRange(validFrom, validUntil);

            var reward = new Reward
            {
                Name = title,
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                CategoryId = categoryId,
                VoucherCodeType = voucherCodeType,
                PointsCost = request.PointsCost!.Value,
                StockQuantity = request.Stock,
                ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
                ValidFrom = validFrom,
                ValidUntil = validUntil,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                await _rewardRepository.AddAsync(reward);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.RewardCreate,
                    AuditResourceTypes.Reward,
                    reward.RewardId.ToString(CultureInfo.InvariantCulture),
                    $"Created reward '{reward.Name}' (category: {category.Name}, pointsCost: {reward.PointsCost}, stock: {reward.StockQuantity}).",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return MapToDto(reward, category.Name, redemptionsCount: 0);
        }

        public async Task<RewardResponseDto?> UpdateAsync(
                 int rewardId,
                 UpdateRewardRequestDto request,
                 int actorAdminId,
                 CancellationToken cancellationToken = default)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return null;
            }

            string categoryName = reward.Category?.Name ?? string.Empty;
            var changedFields = new List<string>();

            if (request.CategoryId.HasValue)
            {
                var category = await _categoryRepository.GetByIdAsync(request.CategoryId.Value);
                if (category == null || !category.IsActive)
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "The specified category does not exist or is archived.",
                        new[] { new { field = "categoryId", message = "The specified category does not exist or is archived." } });
                }
                reward.CategoryId = request.CategoryId.Value;
                categoryName = category.Name;
                changedFields.Add("categoryId");
            }

            if (request.Title != null)
            {
                var trimmedTitle = request.Title.Trim();
                if (trimmedTitle.Length == 0)
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Title cannot be empty.",
                        new[] { new { field = "title", message = "Title cannot be empty." } });
                }
                reward.Name = trimmedTitle;
                changedFields.Add("title");
            }

            if (request.Description != null)
            {
                reward.Description = string.IsNullOrWhiteSpace(request.Description)
                    ? null
                    : request.Description.Trim();
                changedFields.Add("description");
            }

            if (request.VoucherCodeType != null)
            {
                reward.VoucherCodeType = NormalizeAndValidateVoucherCodeType(request.VoucherCodeType);
                changedFields.Add("voucherCodeType");
            }

            if (request.PointsCost.HasValue)
            {
                reward.PointsCost = request.PointsCost.Value;
                changedFields.Add("pointsCost");
            }

            if (request.Stock.HasValue)
            {
                reward.StockQuantity = request.Stock.Value;
                changedFields.Add("stock");
            }

            if (request.ImageUrl != null)
            {
                reward.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl)
                    ? null
                    : request.ImageUrl.Trim();
                changedFields.Add("imageUrl");
            }

            var effectiveValidFrom = request.ValidFrom.HasValue
                ? EnsureUtcNullable(request.ValidFrom)
                : EnsureUtcNullable(reward.ValidFrom);
            var effectiveValidUntil = request.ValidUntil.HasValue
                ? EnsureUtcNullable(request.ValidUntil)
                : EnsureUtcNullable(reward.ValidUntil);

            ValidateValidityRange(effectiveValidFrom, effectiveValidUntil);

            if (request.ValidFrom.HasValue)
            {
                reward.ValidFrom = effectiveValidFrom;
                changedFields.Add("validFrom");
            }

            if (request.ValidUntil.HasValue)
            {
                reward.ValidUntil = effectiveValidUntil;
                changedFields.Add("validUntil");
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                _rewardRepository.Update(reward);

                var summary = changedFields.Count > 0
                    ? $"Updated reward '{reward.Name}' fields ({string.Join(", ", changedFields)})."
                    : $"Reward '{reward.Name}' update submitted.";

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.RewardUpdate,
                    AuditResourceTypes.Reward,
                    reward.RewardId.ToString(CultureInfo.InvariantCulture),
                    summary,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            var redemptionsCount = await _rewardRepository.GetRedemptionsCountAsync(reward.RewardId);
            return MapToDto(reward, categoryName, redemptionsCount);
        }

        private static RewardResponseDto MapToDto(Reward reward, string categoryName, int redemptionsCount)
        {
            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = categoryName,
                VoucherCodeType = reward.VoucherCodeType,
                PointsCost = reward.PointsCost,
                Stock = reward.StockQuantity,
                RedemptionsCount = redemptionsCount,
                Status = !reward.IsActive
                    ? "archived"
                    : reward.StockQuantity > 0
                        ? "in_stock"
                        : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = EnsureUtcNullable(reward.ValidFrom),
                ValidUntil = EnsureUtcNullable(reward.ValidUntil)
            };
        }

        private static string? NormalizeAndValidateVoucherCodeType(string? raw)
        {
            if (raw is null)
            {
                return null;
            }

            var trimmed = raw.Trim();
            if (trimmed.Length == 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid voucherCodeType.",
                    new[] { new { field = "voucherCodeType", message = "voucherCodeType must be one of: code, qr, barcode." } });
            }

            var normalized = trimmed.ToLowerInvariant();
            if (normalized is not ("code" or "qr" or "barcode"))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid voucherCodeType.",
                    new[] { new { field = "voucherCodeType", message = "voucherCodeType must be one of: code, qr, barcode." } });
            }

            return normalized;
        }

        private static DateTime? EnsureUtcNullable(DateTime? value)
        {
            if (!value.HasValue)
            {
                return null;
            }

            return value.Value.Kind switch
            {
                DateTimeKind.Utc => value.Value,
                DateTimeKind.Local => value.Value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
            };
        }

        private static void ValidateValidityRange(DateTime? validFrom, DateTime? validUntil)
        {
            if (validFrom.HasValue && validUntil.HasValue && validFrom.Value > validUntil.Value)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid validity date range.",
                    new[] { new { field = "validUntil", message = "Valid until date cannot be earlier than valid from date." } });
            }
        }

        public async Task<ArchiveRewardResult> ArchiveAsync(
            int rewardId,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return ArchiveRewardResult.NotFound;
            }

            if (!reward.IsActive)
            {
                return ArchiveRewardResult.AlreadyArchived;
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                reward.IsActive = false;

                _rewardRepository.Update(reward);

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.RewardArchive,
                    AuditResourceTypes.Reward,
                    reward.RewardId.ToString(CultureInfo.InvariantCulture),
                    $"Archived reward '{reward.Name}'.",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return ArchiveRewardResult.Archived;
        }

        public async Task<UnarchiveRewardResult> UnarchiveAsync(int rewardId)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return UnarchiveRewardResult.NotFound;
            }

            if (reward.IsActive)
            {
                return UnarchiveRewardResult.NotArchived;
            }

            // Check if parent category is active
            var category = await _categoryRepository.GetByIdAsync(reward.CategoryId);
            if (category == null || !category.IsActive)
            {
                return UnarchiveRewardResult.CategoryArchived;
            }

            reward.IsActive = true;

            _rewardRepository.Update(reward);
            await _unitOfWork.SaveChangesAsync();

            return UnarchiveRewardResult.Success;
        }

        public async Task<bool> DecrementStockAsync(int rewardId, int quantity = 1)
        {
            return await _rewardRepository.DecrementStockIfAvailableAsync(rewardId, quantity);
        }

        public async Task<RedeemRewardResultDto> RedeemRewardAsync(
            int userId,
            int rewardId,
            int? pointsCost,
            CancellationToken cancellationToken = default)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);
            if (reward == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Reward item not found.");
            }

            if (reward.StockQuantity <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "OUT_OF_STOCK",
                    "Reward item is out of stock.");
            }

            var pointsRequired = pointsCost ?? reward.PointsCost;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var stockDecremented = await _rewardRepository.DecrementStockIfAvailableAsync(rewardId, 1, cancellationToken);
                if (!stockDecremented)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "OUT_OF_STOCK",
                        "Reward item is out of stock.");
                }

                var debitResult = await _walletService.DebitPointsForVoucherAsync(
                    userId,
                    rewardId,
                    pointsRequired,
                    cancellationToken);

                var remainingStock = await _rewardRepository.GetStockQuantityAsync(rewardId, cancellationToken);
                if (remainingStock == 0)
                {
                    await _notificationService.PublishToAdminsAsync(
                        "Reward out of stock",
                        $"{reward.Name} (Reward #{reward.RewardId}) reached 0 stock after redemption.",
                        AdminNotificationTypes.Info,
                        AdminNotificationSources.RewardStock,
                        reward.RewardId.ToString(CultureInfo.InvariantCulture),
                        cancellationToken);
                }

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                var voucherCode = $"ECO-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";

                return new RedeemRewardResultDto
                {
                    VoucherCode = voucherCode,
                    PointsDeducted = debitResult.PointsDeducted,
                    NewAvailablePoints = debitResult.NewAvailablePoints
                };
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }
    }
}
