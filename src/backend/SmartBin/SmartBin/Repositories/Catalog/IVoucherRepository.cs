using SmartBin.DTOs.Vouchers;
using SmartBin.Models;

namespace SmartBin.Repositories
{
    public interface IVoucherRepository
    {
        Task AddAsync(Voucher voucher, CancellationToken cancellationToken = default);
        Task<(List<VoucherItemDto> Items, int TotalItems)> GetUserVouchersPagedAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            DateTime now,
            CancellationToken cancellationToken = default);
        Task<Dictionary<int, int>> GetRedemptionCountsByRewardIdsAsync(
            IEnumerable<int> rewardIds,
            CancellationToken cancellationToken = default);
        Task<int> GetRedemptionCountByRewardIdAsync(
            int rewardId,
            CancellationToken cancellationToken = default);
    }
}