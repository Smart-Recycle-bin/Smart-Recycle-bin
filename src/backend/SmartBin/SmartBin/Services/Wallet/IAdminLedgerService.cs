using SmartBin.Dtos.Common;
using SmartBin.DTOs.Wallet;

namespace SmartBin.Services.Wallets
{
    public interface IAdminLedgerService
    {
        Task<(List<AdminLedgerRowDto> Items, PaginationMetaDto Meta)> GetAdminLedgerAsync(
            int? userId,
            string? from,
            string? to,
            string? type,
            string? source,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<(ManualAdjustmentResponseDto Response, bool IsReplay)> ApplyManualAdjustmentAsync(
            int actorAdminId,
            string? idempotencyKey,
            ManualAdjustmentRequestDto request,
            CancellationToken cancellationToken = default);
    }
}
