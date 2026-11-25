using SmartBin.DTOs.Common;
using SmartBin.DTOs.Wallet;

namespace SmartBin.Services.Wallets
{
    public interface IWalletService
    {
        Task<WalletBalanceResponseDto> GetBalanceAsync(
            int userId,
            CancellationToken cancellationToken = default);

        Task<(List<LedgerEntryDto> Items, PaginationMeta Meta)> GetLedgerAsync(
            int userId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<(int NewAvailablePoints, int NewLifetimePoints)> CreditSessionPointsAsync(
            int userId,
            int sessionId,
            int points,
            CancellationToken cancellationToken = default);

        Task<WalletDebitResultDto> DebitPointsForVoucherAsync(
            int userId,
            int voucherId,
            int pointsCost,
            CancellationToken cancellationToken = default);
    }
}
