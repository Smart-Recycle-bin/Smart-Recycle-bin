using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs;
using SmartBin.Models;
using SmartBin.Repositories;
using SmartBin.Services.Wallets;

namespace SmartBin.Services
{
    public class RewardService : IRewardService
    {
        private readonly IRewardRepository _rewardRepository;
        private readonly IRewardCategoryRepository _categoryRepository;
        private readonly IWalletService _walletService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly AppDbContext _db;

        public RewardService(
            IRewardRepository rewardRepository,
            IRewardCategoryRepository categoryRepository,
            IWalletService walletService,
            IUnitOfWork unitOfWork,
            AppDbContext db)
        {
            _rewardRepository = rewardRepository;
            _categoryRepository = categoryRepository;
            _walletService = walletService;
            _unitOfWork = unitOfWork;
            _db = db;
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
            var (rewards, totalItems) = await _rewardRepository.GetAllPagedAsync(
                categoryId,
                status,
                search,
                page,
                pageSize,
                sortBy,
                sortDir);

            var items = rewards.Select(r => new RewardResponseDto
            {
                ItemId = r.RewardId,
                Title = r.Name,
                Description = r.Description,
                CategoryId = r.CategoryId,
                CategoryName = r.Category?.Name ?? string.Empty,
                VoucherCodeType = r.VoucherCodeType,
                PointsCost = r.PointsCost,
                Stock = r.StockQuantity,
                RedemptionsCount = 0,
                Status = !r.IsActive
                    ? "archived"
                    : r.StockQuantity > 0
                      ? "in_stock"
                      : "out_of_stock",
                ImageUrl = r.ImageUrl,
                ValidFrom = r.ValidFrom,
                ValidUntil = r.ValidUntil
            }).ToList();

            return (items, totalItems);
        }

        public async Task<RewardResponseDto?> GetByIdAsync(int rewardId)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return null;
            }

            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = reward.Category?.Name ?? string.Empty,
                VoucherCodeType = reward.VoucherCodeType,
                PointsCost = reward.PointsCost,
                Stock = reward.StockQuantity,
                RedemptionsCount = 0,
                Status = !reward.IsActive
                  ? "archived"
                  : reward.StockQuantity > 0
                     ? "in_stock"
                     : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = reward.ValidFrom,
                ValidUntil = reward.ValidUntil
            };
        }

        public async Task<RewardResponseDto> CreateAsync(CreateRewardRequestDto request)
        {
            var category = await _categoryRepository
                .GetByIdAsync(request.CategoryId);

            if (category == null)
            {
                throw new ArgumentException("Category not found.");
            }

            var reward = new Reward
            {
                Name = request.Title,
                Description = request.Description,
                CategoryId = request.CategoryId,
                VoucherCodeType = request.VoucherCodeType,
                PointsCost = request.PointsCost,
                StockQuantity = request.Stock,
                ImageUrl = request.ImageUrl,
                ValidFrom = request.ValidFrom,
                ValidUntil = request.ValidUntil,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _rewardRepository.AddAsync(reward);
            await _unitOfWork.SaveChangesAsync();

            return new RewardResponseDto
            {
                ItemId = reward.RewardId,
                Title = reward.Name,
                Description = reward.Description,
                CategoryId = reward.CategoryId,
                CategoryName = category.Name,
                VoucherCodeType = reward.VoucherCodeType,
                PointsCost = reward.PointsCost,
                Stock = reward.StockQuantity,
                RedemptionsCount = 0,
                Status = !reward.IsActive
                 ? "archived"
                 : reward.StockQuantity > 0
                     ? "in_stock"
                     : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = reward.ValidFrom,
                ValidUntil = reward.ValidUntil
            };
        }

        public async Task<RewardResponseDto?> UpdateAsync(
                 int rewardId,
                 UpdateRewardRequestDto request)
        {
            var reward = await _rewardRepository.GetByIdAsync(rewardId);

            if (reward == null)
            {
                return null;
            }

            string categoryName = reward.Category?.Name ?? string.Empty;

            if (request.CategoryId.HasValue)
            {
                var category = await _categoryRepository.GetByIdAsync(request.CategoryId.Value);
                if (category == null)
                {
                    throw new ArgumentException("Category not found.");
                }
                reward.CategoryId = request.CategoryId.Value;
                categoryName = category.Name;
            }

            if (!string.IsNullOrWhiteSpace(request.Title))
            {
                reward.Name = request.Title.Trim();
            }

            if (request.Description != null)
            {
                reward.Description = request.Description;
            }

            if (request.VoucherCodeType != null)
            {
                reward.VoucherCodeType = request.VoucherCodeType;
            }

            if (request.PointsCost.HasValue)
            {
                reward.PointsCost = request.PointsCost.Value;
            }

            if (request.Stock.HasValue)
            {
                reward.StockQuantity = request.Stock.Value;
            }

            if (request.ImageUrl != null)
            {
                reward.ImageUrl = request.ImageUrl;
            }

            if (request.ValidFrom.HasValue)
            {
                reward.ValidFrom = request.ValidFrom.Value;
            }

            if (request.ValidUntil.HasValue)
            {
                reward.ValidUntil = request.ValidUntil.Value;
            }

            _rewardRepository.Update(reward);
            await _unitOfWork.SaveChangesAsync();

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
                RedemptionsCount = 0,
                Status = !reward.IsActive
                   ? "archived"
                   : reward.StockQuantity > 0
                       ? "in_stock"
                       : "out_of_stock",
                ImageUrl = reward.ImageUrl,
                ValidFrom = reward.ValidFrom,
                ValidUntil = reward.ValidUntil
            };
        }

        public async Task<ArchiveRewardResult> ArchiveAsync(int rewardId)
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

            reward.IsActive = false;

            _rewardRepository.Update(reward);
            await _unitOfWork.SaveChangesAsync();

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
            int denominationEgp,
            CancellationToken cancellationToken = default)
        {
            // SECURITY: Never trust client-supplied cost.
            // Only accept known denomination tiers (10, 20, 50 EGP) and compute points server-side.
            int multiplier = denominationEgp switch
            {
                10 => 1,
                20 => 2,
                50 => 5,
                _ => throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid denomination. Supported values are 10, 20, or 50 EGP.",
                    new[] { new { field = "denominationEgp", message = "denominationEgp must be 10, 20, or 50." } })
            };

            var reward = await _rewardRepository.GetByIdAsync(rewardId);
            if (reward == null || !reward.IsActive || (reward.Category != null && !reward.Category.IsActive))
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Reward item not found.");
            }

            var now = DateTime.UtcNow;
            if ((reward.ValidFrom.HasValue && reward.ValidFrom.Value > now) ||
                (reward.ValidUntil.HasValue && reward.ValidUntil.Value < now))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "REWARD_EXPIRED",
                    "Reward voucher is outside its valid redemption period.");
            }

            if (reward.StockQuantity <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "OUT_OF_STOCK",
                    "Reward item is out of stock.");
            }

            int pointsRequired = checked(reward.PointsCost * multiplier);

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var stockDecremented = await _rewardRepository.DecrementStockIfAvailableAsync(rewardId, 1, cancellationToken);
                if (!stockDecremented)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "OUT_OF_STOCK",
                        "Reward item is out of stock.");
                }

                var debitResult = await _walletService.DebitPointsForVoucherAsync(
                    userId,
                    rewardId,
                    pointsRequired,
                    cancellationToken);

                var voucherCode = $"ECO-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";

                // Persist the voucher code inside the same transaction so redemption is fully atomic
                var userVoucher = new UserVoucher
                {
                    UserId = userId,
                    RewardId = rewardId,
                    VoucherCode = voucherCode,
                    PointsDeducted = debitResult.PointsDeducted,
                    DenominationEgp = denominationEgp,
                    IsUsed = false,
                    RedeemedAt = now
                };
                _db.UserVouchers.Add(userVoucher);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                return new RedeemRewardResultDto
                {
                    VoucherCode = voucherCode,
                    PointsDeducted = debitResult.PointsDeducted,
                    NewAvailablePoints = debitResult.NewAvailablePoints
                };
            }
            catch
            {
                if (_unitOfWork.HasActiveTransaction)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                }
                throw;
            }
        }
    }
}
