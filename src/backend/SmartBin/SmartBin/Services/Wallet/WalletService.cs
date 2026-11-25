using SmartBin.DTOs.Common;
using SmartBin.DTOs.Wallet;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Wallet;

namespace SmartBin.Services.Wallets
{
    public class WalletService : IWalletService
    {
        private readonly IWalletRepository _walletRepository;
        private readonly IUnitOfWork _unitOfWork;

        public WalletService(IWalletRepository walletRepository, IUnitOfWork unitOfWork)
        {
            _walletRepository = walletRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<WalletBalanceResponseDto> GetBalanceAsync(
            int userId,
            CancellationToken cancellationToken = default)
        {
            var wallet = await _walletRepository.GetByUserIdAsync(userId, cancellationToken);

            if (wallet != null)
            {
                return new WalletBalanceResponseDto
                {
                    AvailablePoints = wallet.AvailablePoints,
                    LifetimeEarnedPoints = wallet.LifetimeEarnedPoints
                };
            }

            var created = await _walletRepository.EnsureWalletExistsAsync(userId, cancellationToken);
            return new WalletBalanceResponseDto
            {
                AvailablePoints = created.AvailablePoints,
                LifetimeEarnedPoints = created.LifetimeEarnedPoints
            };
        }

        public async Task<(List<LedgerEntryDto> Items, PaginationMeta Meta)> GetLedgerAsync(
            int userId,
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

            var wallet = await _walletRepository.GetByUserIdAsync(userId, cancellationToken);
            if (wallet == null)
            {
                return (new List<LedgerEntryDto>(), new PaginationMeta
                {
                    Page = page,
                    PageSize = pageSize,
                    TotalItems = 0,
                    TotalPages = 0
                });
            }

            var (items, totalItems) = await _walletRepository.GetLedgerPagedAsync(
                wallet.WalletId,
                page,
                pageSize,
                cancellationToken);

            var totalPages = totalItems == 0
                ? 0
                : (int)Math.Ceiling(totalItems / (double)pageSize);

            var meta = new PaginationMeta
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };

            return (items, meta);
        }

        public async Task<(int NewAvailablePoints, int NewLifetimePoints)> CreditSessionPointsAsync(
            int userId,
            int sessionId,
            int points,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0 || sessionId <= 0 || points < 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid credit parameters.");
            }

            var wallet = await _walletRepository.EnsureWalletExistsAsync(userId, cancellationToken);

            if (points == 0)
            {
                return (wallet.AvailablePoints, wallet.LifetimeEarnedPoints);
            }

            var (newAvailable, newLifetime) = await _walletRepository.CreditPointsAsync(
                wallet.WalletId,
                points,
                cancellationToken);

            var transaction = new LedgerTransaction
            {
                WalletId = wallet.WalletId,
                SessionId = sessionId,
                VoucherId = null,
                TransactionType = LedgerTransactionType.Credit,
                PointsDelta = points,
                RunningBalance = newAvailable,
                Source = LedgerSource.SessionAward,
                CreatedAt = DateTime.UtcNow
            };

            await _walletRepository.AddLedgerTransactionAsync(transaction, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return (newAvailable, newLifetime);
        }

        public async Task<WalletDebitResultDto> DebitPointsForVoucherAsync(
            int userId,
            int voucherId,
            int pointsCost,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0 || voucherId <= 0 || pointsCost <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "userId, voucherId, and pointsCost must be positive integers.");
            }

            bool ownsTransaction = !_unitOfWork.HasActiveTransaction;
            if (ownsTransaction)
            {
                await _unitOfWork.BeginTransactionAsync(cancellationToken);
            }

            try
            {
                var wallet = await _walletRepository.EnsureWalletExistsAsync(userId, cancellationToken);

                var debited = await _walletRepository.TryDebitPointsAsync(wallet.WalletId, pointsCost, cancellationToken);
                if (!debited)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "INSUFFICIENT_POINTS",
                        "Insufficient available points for this redemption.");
                }

                var newAvailablePoints = await _walletRepository.GetWalletAvailablePointsByIdAsync(wallet.WalletId, cancellationToken);

                var ledgerEntry = new LedgerTransaction
                {
                    WalletId = wallet.WalletId,
                    SessionId = null,
                    VoucherId = voucherId,
                    TransactionType = LedgerTransactionType.Debit,
                    PointsDelta = -pointsCost,
                    RunningBalance = newAvailablePoints,
                    Source = LedgerSource.VoucherRedemption,
                    CreatedAt = DateTime.UtcNow
                };

                await _walletRepository.AddLedgerTransactionAsync(ledgerEntry, cancellationToken);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                if (ownsTransaction)
                {
                    await _unitOfWork.CommitTransactionAsync(cancellationToken);
                }

                return new WalletDebitResultDto
                {
                    WalletId = wallet.WalletId,
                    TransactionId = ledgerEntry.TransactionId,
                    PointsDeducted = pointsCost,
                    NewAvailablePoints = newAvailablePoints
                };
            }
            catch
            {
                if (ownsTransaction)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                }

                throw;
            }
        }
    }
}
