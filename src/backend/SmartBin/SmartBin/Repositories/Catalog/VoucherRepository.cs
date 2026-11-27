using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Vouchers;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories
{
    public class VoucherRepository : IVoucherRepository
    {
        private readonly AppDbContext _context;

        public VoucherRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Voucher voucher, CancellationToken cancellationToken = default)
        {
            await _context.Vouchers.AddAsync(voucher, cancellationToken);
        }

        public async Task<(List<VoucherItemDto> Items, int TotalItems)> GetUserVouchersPagedAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            DateTime now,
            CancellationToken cancellationToken = default)
        {
            var query = _context.Vouchers
                .AsNoTracking()
                .Where(v => v.UserId == userId);

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalized = status.Trim().ToLowerInvariant();
                query = normalized switch
                {
                    VoucherStatus.Unused => query.Where(v => v.Status == VoucherStatus.Unused && (v.ExpiryDate == null || v.ExpiryDate >= now)),
                    VoucherStatus.Used => query.Where(v => v.Status == VoucherStatus.Used),
                    VoucherStatus.Expired => query.Where(v => v.Status == VoucherStatus.Expired ||
                                                             (v.Status == VoucherStatus.Unused && v.ExpiryDate != null && v.ExpiryDate < now)),
                    _ => query
                };
            }

            var totalItems = await query.CountAsync(cancellationToken);

            var items = await query
                .OrderByDescending(v => v.RedeemedAt)
                .ThenByDescending(v => v.VoucherId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(v => new VoucherItemDto
                {
                    VoucherId = v.VoucherId,
                    RedemptionId = v.RedemptionId,
                    ItemTitle = v.Reward.Name,
                    PointsSpent = v.PointsSpent,
                    ValueEgpAtRedemption = v.ValueEgpAtRedemption,
                    VoucherCode = v.Code,
                    QrImageUrl = CatalogSettings.QrBaseUrl + "/" + v.VoucherId + ".png",
                    RedeemedAt = v.RedeemedAt,
                    Status = v.Status == VoucherStatus.Unused && v.ExpiryDate != null && v.ExpiryDate < now
                        ? VoucherStatus.Expired
                        : v.Status
                })
                .ToListAsync(cancellationToken);

            return (items, totalItems);
        }

        public async Task<Dictionary<int, int>> GetRedemptionCountsByRewardIdsAsync(
            IEnumerable<int> rewardIds,
            CancellationToken cancellationToken = default)
        {
            var ids = rewardIds.Distinct().ToList();
            if (ids.Count == 0)
            {
                return new Dictionary<int, int>();
            }

            return await _context.Vouchers
                .AsNoTracking()
                .Where(v => ids.Contains(v.RewardId))
                .GroupBy(v => v.RewardId)
                .Select(g => new { RewardId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.RewardId, x => x.Count, cancellationToken);
        }

        public async Task<int> GetRedemptionCountByRewardIdAsync(
            int rewardId,
            CancellationToken cancellationToken = default)
        {
            return await _context.Vouchers
                .AsNoTracking()
                .CountAsync(v => v.RewardId == rewardId, cancellationToken);
        }
    }
}