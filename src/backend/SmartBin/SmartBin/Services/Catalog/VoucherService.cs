using System.Globalization;
using System.Security.Cryptography;
using SmartBin.Common;
using SmartBin.DTOs;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Vouchers;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Sessions;
using SmartBin.Services.Wallets;

namespace SmartBin.Services
{
    public class VoucherService : IVoucherService
    {
        private static int _tempRedemptionCounter;

        private readonly IRewardRepository _rewardRepository;
        private readonly IVoucherRepository _voucherRepository;
        private readonly ISessionRepository _sessionRepository;
        private readonly IWalletService _walletService;
        private readonly IUnitOfWork _unitOfWork;

        public VoucherService(
            IRewardRepository rewardRepository,
            IVoucherRepository voucherRepository,
            ISessionRepository sessionRepository,
            IWalletService walletService,
            IUnitOfWork unitOfWork)
        {
            _rewardRepository = rewardRepository;
            _voucherRepository = voucherRepository;
            _sessionRepository = sessionRepository;
            _walletService = walletService;
            _unitOfWork = unitOfWork;
        }

        public async Task<RedemptionResultDto> RedeemAsync(
            int userId,
            int itemId,
            CancellationToken cancellationToken = default)
        {
            if (itemId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid itemId.",
                    new[] { new { field = "itemId", message = "itemId must be a positive integer." } });
            }

            var user = await _sessionRepository.GetUserAsync(userId, cancellationToken)
                ?? throw new ApiException(StatusCodes.Status401Unauthorized, "UNAUTHORIZED", "Access token is missing or invalid.");

            if (string.Equals(user.AccountStatus, "suspended", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(user.AccountStatus, "banned", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "ACCOUNT_SUSPENDED",
                    "Blocked accounts cannot redeem vouchers.");
            }

            if (string.Equals(user.AccountStatus, "inactive", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "ACCOUNT_INACTIVE",
                    "Your account is inactive.");
            }

            var now = DateTime.UtcNow;
            var reward = await _rewardRepository.GetActiveRewardWithCategoryAsync(itemId, now, cancellationToken)
                ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND", "Catalog item not found.");

            if (reward.StockQuantity <= 0)
            {
                throw new ApiException(StatusCodes.Status409Conflict, "OUT_OF_STOCK", "This item is out of stock.");
            }

            var availablePoints = await _walletService.GetAvailablePointsAsync(userId, cancellationToken);
            if (availablePoints < reward.PointsCost)
            {
                throw new ApiException(StatusCodes.Status409Conflict, "INSUFFICIENT_POINTS", "Not enough available points.");
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                if (!await _rewardRepository.DecrementStockIfAvailableAsync(reward.RewardId, 1, cancellationToken))
                {
                    throw new ApiException(StatusCodes.Status409Conflict, "OUT_OF_STOCK", "This item is out of stock.");
                }

                var tempRedemptionId = -((Interlocked.Increment(ref _tempRedemptionCounter) & 0x3FFFFFFF) + 1);

                var voucher = new Voucher
                {
                    RedemptionId = tempRedemptionId,
                    Code = MakeCode(reward.Category.Name),
                    UserId = userId,
                    RewardId = reward.RewardId,
                    IssuedAt = now,
                    RedeemedAt = now,
                    ExpiryDate = reward.ValidUntil,
                    Status = VoucherStatus.Unused,
                    PointsSpent = reward.PointsCost,
                    ValueEgpAtRedemption = Math.Round(reward.PointsCost / (decimal)CatalogSettings.PointsPerEgp, 2)
                };

                await _voucherRepository.AddAsync(voucher, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                voucher.RedemptionId = voucher.VoucherId;
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                var debit = await _walletService.DebitPointsForVoucherAsync(
                    userId,
                    voucher.VoucherId,
                    reward.PointsCost,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                return new RedemptionResultDto
                {
                    RedemptionId = voucher.RedemptionId,
                    ItemId = voucher.RewardId,
                    VoucherId = voucher.VoucherId,
                    VoucherCode = voucher.Code,
                    PointsSpent = voucher.PointsSpent,
                    ValueEgpAtRedemption = voucher.ValueEgpAtRedemption,
                    NewAvailablePoints = debit.NewAvailablePoints
                };
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task<(List<VoucherItemDto> Items, PaginationMeta Meta)> ListAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            if (page < 1)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "page", message = "page must be greater than or equal to 1." } });
            }

            if (pageSize < 1 || pageSize > 100)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "pageSize", message = "pageSize must be between 1 and 100." } });
            }

            string? normalizedStatus = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                normalizedStatus = status.Trim().ToLowerInvariant();
                if (!VoucherStatus.All.Contains(normalizedStatus))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid status filter.",
                        new[] { new { field = "status", message = "Must be one of: unused, used, expired." } });
                }
            }

            var (items, totalItems) = await _voucherRepository.GetUserVouchersPagedAsync(
                userId,
                normalizedStatus,
                page,
                pageSize,
                DateTime.UtcNow,
                cancellationToken);

            var meta = new PaginationMeta
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (items, meta);
        }

        private static string MakeCode(string brand)
        {
            var prefix = new string(brand.Where(char.IsLetterOrDigit).Take(3).ToArray()).ToUpperInvariant();
            if (prefix.Length == 0)
            {
                prefix = "EVC";
            }

            var hex = Convert.ToHexString(RandomNumberGenerator.GetBytes(2));
            var digits = RandomNumberGenerator.GetInt32(0, 10000).ToString("D4", CultureInfo.InvariantCulture);
            return $"{prefix}-{hex}-{digits}";
        }
    }
}