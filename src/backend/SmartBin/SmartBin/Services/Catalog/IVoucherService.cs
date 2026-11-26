using SmartBin.DTOs;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Vouchers;

namespace SmartBin.Services
{
    public interface IVoucherService
    {
        Task<RedemptionResultDto> RedeemAsync(
            int userId,
            int itemId,
            CancellationToken cancellationToken = default);

        Task<(List<VoucherItemDto> Items, PaginationMeta Meta)> ListAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);
    }
}