using SmartBin.DTOs.Wallet;
using SmartBin.Models;

namespace SmartBin.Repositories.Wallet
{
    public interface IAdminLedgerRepository
    {
        Task<(List<AdminLedgerRowDto> Items, int TotalItems)> GetAdminLedgerPagedAsync(
            int? userId,
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            string? entryType,
            string? source,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<bool> UserExistsAsync(int userId, CancellationToken cancellationToken = default);

        Task<LedgerAdjustmentIdempotencyRecord?> GetIdempotencyRecordAsync(
            string idempotencyKey,
            CancellationToken cancellationToken = default);

        Task<ManualAdjustmentResponseDto> ExecuteAdjustmentAtomicAsync(
            int targetUserId,
            int amount,
            string entryType,
            string reasonCode,
            string reasonNote,
            int actorAdminId,
            string idempotencyKey,
            string requestHash,
            DateTime timestampUtc,
            CancellationToken cancellationToken = default);
    }

    public sealed class LedgerAdjustmentIdempotencyRecord
    {
        public string IdempotencyKey { get; init; } = string.Empty;
        public string RequestHash { get; init; } = string.Empty;
        public int TransactionId { get; init; }
        public int TargetUserId { get; init; }
        public int PointsDelta { get; init; }
        public int RunningBalance { get; init; }
    }
}
