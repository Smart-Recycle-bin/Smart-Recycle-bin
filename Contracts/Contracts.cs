using System.Threading.Tasks;
using System.Threading;

namespace EcoBin.Api;

// Services written by OTHER members that this module calls.
// They must use the same scoped EcoBinDbContext so they join our transaction.

public record WalletDebitResult(bool Success, int NewAvailablePoints);

/// <summary>Member 2 (Abobakr).</summary>
public interface IWalletService
{
    Task<int> GetAvailablePointsAsync(int userId, CancellationToken ct = default);

    /// <summary>Subtract points from AvailablePoints and append a ledger row (with voucherId).
    /// Return Success=false if the balance is too low (do not throw).</summary>
    Task<WalletDebitResult> DebitForRedemptionAsync(int userId, int points, int voucherId, CancellationToken ct = default);
}

public record SessionFinalizationResult(int PointsAwarded, int TransactionId);

/// <summary>Member 2 (Abobakr). Must be safe to call twice for the same session.</summary>
public interface ISessionPointsService
{
    Task<SessionFinalizationResult> FinalizeSessionPointsAsync(int sessionId, CancellationToken ct = default);
}

/// <summary>Member 4 (Moaz). Should do: UPDATE REWARD SET StockQuantity = StockQuantity - 1
/// WHERE RewardId = @id AND StockQuantity > 0, and return true only if a row was changed.</summary>
public interface IRewardStockService
{
    Task<bool> TryDecrementStockAsync(int rewardId, CancellationToken ct = default);
}

// Service written by US that OTHER members call.

/// <summary>Member 4 (Moaz) calls this after every admin change.</summary>
public interface IAuditLogService
{
    Task LogAsync(int adminId, string actionType, string resourceType, int resourceId,
        string? reason = null, CancellationToken ct = default);
}
