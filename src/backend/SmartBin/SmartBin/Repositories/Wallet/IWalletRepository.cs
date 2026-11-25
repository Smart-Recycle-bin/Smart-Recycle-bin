using SmartBin.DTOs.Wallet;
using SmartBin.Models;

namespace SmartBin.Repositories.Wallet
{
    public interface IWalletRepository
    {
        Task<Models.Wallet?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default);
        Task AddAsync(Models.Wallet wallet, CancellationToken cancellationToken = default);
        Task<Models.Wallet> EnsureWalletExistsAsync(int userId, CancellationToken cancellationToken = default);
        Task<int> GetAvailablePointsAsync(int userId, CancellationToken cancellationToken = default);
        Task<(List<LedgerEntryDto> Items, int TotalItems)> GetLedgerPagedAsync(int walletId, int page, int pageSize, CancellationToken cancellationToken = default);
        Task<(int AvailablePoints, int LifetimeEarnedPoints)> CreditPointsAsync(int walletId, int points, CancellationToken cancellationToken = default);
        Task<bool> TryDebitPointsAsync(int walletId, int pointsCost, CancellationToken cancellationToken = default);
        Task<int> GetWalletAvailablePointsByIdAsync(int walletId, CancellationToken cancellationToken = default);
        Task AddLedgerTransactionAsync(LedgerTransaction transaction, CancellationToken cancellationToken = default);
    }
}
