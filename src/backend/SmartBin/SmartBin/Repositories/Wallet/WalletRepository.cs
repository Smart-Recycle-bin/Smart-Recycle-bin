using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Wallet;
using SmartBin.Models;

namespace SmartBin.Repositories.Wallet
{
    public class WalletRepository : IWalletRepository
    {
        private readonly AppDbContext _context;

        public WalletRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Models.Wallet?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
        {
            return await _context.Wallets
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);
        }

        public async Task AddAsync(Models.Wallet wallet, CancellationToken cancellationToken = default)
        {
            await _context.Wallets.AddAsync(wallet, cancellationToken);
        }

        public async Task<int> GetAvailablePointsAsync(int userId, CancellationToken cancellationToken = default)
        {
            return await _context.Wallets
                .AsNoTracking()
                .Where(w => w.UserId == userId)
                .Select(w => (int?)w.AvailablePoints)
                .FirstOrDefaultAsync(cancellationToken) ?? 0;
        }

        public async Task<Models.Wallet> EnsureWalletExistsAsync(int userId, CancellationToken cancellationToken = default)
        {
            var existing = await _context.Wallets
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);

            if (existing != null)
            {
                return existing;
            }

            var wallet = new Models.Wallet
            {
                UserId = userId,
                AvailablePoints = 0,
                LifetimeEarnedPoints = 0
            };

            try
            {
                await _context.Wallets.AddAsync(wallet, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                _context.Entry(wallet).State = EntityState.Detached;
                return wallet;
            }
            catch (DbUpdateException)
            {
                _context.Entry(wallet).State = EntityState.Detached;
                var concurrent = await _context.Wallets
                    .AsNoTracking()
                    .FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);

                if (concurrent != null)
                {
                    return concurrent;
                }

                throw;
            }
        }

        public async Task<(List<LedgerEntryDto> Items, int TotalItems)> GetLedgerPagedAsync(
            int walletId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var query = _context.LedgerTransactions
                .AsNoTracking()
                .Where(lt => lt.WalletId == walletId);

            var totalItems = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderByDescending(lt => lt.CreatedAt)
                .ThenByDescending(lt => lt.TransactionId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(lt => new LedgerEntryDto
                {
                    TransactionId = lt.TransactionId,
                    Timestamp = lt.CreatedAt,
                    Title = lt.PointsDelta >= 0 ? "Recycle Survey Bonus" : "Gift Redeem",
                    BinId = lt.Session != null ? (int?)lt.Session.BinId : null,
                    EntryType = lt.TransactionType,
                    PointsDelta = lt.PointsDelta,
                    BalanceAfter = lt.RunningBalance,
                    Source = lt.Source,
                    SourceId = lt.SessionId ?? lt.VoucherId
                })
                .ToListAsync(cancellationToken);

            return (items, totalItems);
        }

        public async Task<(int AvailablePoints, int LifetimeEarnedPoints)> CreditPointsAsync(
            int walletId,
            int points,
            CancellationToken cancellationToken = default)
        {
            await _context.Wallets
                .Where(w => w.WalletId == walletId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(w => w.AvailablePoints, w => w.AvailablePoints + points)
                    .SetProperty(w => w.LifetimeEarnedPoints, w => w.LifetimeEarnedPoints + points),
                    cancellationToken);

            var updated = await _context.Wallets
                .AsNoTracking()
                .Where(w => w.WalletId == walletId)
                .Select(w => new { w.AvailablePoints, w.LifetimeEarnedPoints })
                .FirstAsync(cancellationToken);

            return (updated.AvailablePoints, updated.LifetimeEarnedPoints);
        }

        public async Task<bool> TryDebitPointsAsync(
            int walletId,
            int pointsCost,
            CancellationToken cancellationToken = default)
        {
            var rowsAffected = await _context.Wallets
                .Where(w => w.WalletId == walletId && w.AvailablePoints >= pointsCost)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(w => w.AvailablePoints, w => w.AvailablePoints - pointsCost),
                    cancellationToken);

            return rowsAffected > 0;
        }

        public async Task<int> GetWalletAvailablePointsByIdAsync(int walletId, CancellationToken cancellationToken = default)
        {
            return await _context.Wallets
                .AsNoTracking()
                .Where(w => w.WalletId == walletId)
                .Select(w => w.AvailablePoints)
                .FirstAsync(cancellationToken);
        }

        public async Task AddLedgerTransactionAsync(
            LedgerTransaction transaction,
            CancellationToken cancellationToken = default)
        {
            await _context.LedgerTransactions.AddAsync(transaction, cancellationToken);
        }
    }
}
