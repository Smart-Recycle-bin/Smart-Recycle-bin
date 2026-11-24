using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using depi_project.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoBin.Api;

public interface IVoucherService
{
    Task<RedemptionResult> RedeemAsync(int userId, int itemId, CancellationToken ct);
    Task<(List<VoucherItem> Items, int Total)> ListAsync(int userId, string? status, int page, int pageSize, CancellationToken ct);
}

public class VoucherService(EcoBinDbContext db, IWalletService wallet, IRewardStockService stock) : IVoucherService
{
    // E42: everything happens in ONE transaction. If any step throws, nothing is saved.
    public async Task<RedemptionResult> RedeemAsync(int userId, int itemId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // 1) The user must not be blocked
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == userId, ct)
            ?? throw new AppException(401, "UNAUTHORIZED", "User not found.");
        if (user.AccountStatus is "suspended" or "banned")
            throw new AppException(403, "ACCOUNT_SUSPENDED", "Blocked accounts cannot redeem vouchers.");

        var now = DateTime.UtcNow;

        // 2) The item must exist, be currently valid, and have stock
        var reward = await db.Rewards.AsNoTracking().Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.RewardId == itemId
                                   && r.IsActive
                                   && r.Category.IsActive
                                   && (r.ValidFrom == null || r.ValidFrom <= now)
                                   && (r.ValidUntil == null || r.ValidUntil >= now), ct)
            ?? throw AppException.NotFound("Catalog item not found.");

        if (reward.StockQuantity <= 0)
            throw AppException.Conflict("OUT_OF_STOCK", "This item is out of stock.");

        // Quick pre-check to avoid unnecessary stock lock & voucher insert on low balance
        if (await wallet.GetAvailablePointsAsync(userId, ct) < reward.PointsCost)
            throw AppException.Conflict("INSUFFICIENT_POINTS", "Not enough available points.");

        // 3) Take one from the stock (Member 4). False means someone else took the last one.
        if (!await stock.TryDecrementStockAsync(reward.RewardId, ct))
            throw AppException.Conflict("OUT_OF_STOCK", "This item is out of stock.");

        // 4) Create the voucher with a snapshot of the price and value
        var voucher = new Voucher
        {
            RedemptionId = -Random.Shared.Next(1, int.MaxValue),
            Code = MakeCode(reward.Category.Name),
            UserId = userId,
            RewardId = reward.RewardId,
            IssuedAt = now,
            RedeemedAt = now,
            ExpiryDate = reward.ValidUntil,
            Status = VoucherStatus.Unused,
            PointsSpent = reward.PointsCost,
            ValueEgpAtRedemption = Math.Round(reward.PointsCost / (decimal)Settings.PointsPerEgp, 2)
        };
        db.Vouchers.Add(voucher);
        await db.SaveChangesAsync(ct);
        voucher.RedemptionId = voucher.VoucherId;
        await db.SaveChangesAsync(ct);

        // 5) Take the points and write the ledger row (Member 2)
        var debit = await wallet.DebitForRedemptionAsync(userId, reward.PointsCost, voucher.VoucherId, ct);
        if (!debit.Success)
            throw AppException.Conflict("INSUFFICIENT_POINTS", "Not enough available points.");

        await tx.CommitAsync(ct);

        return new RedemptionResult(voucher.RedemptionId, voucher.RewardId, voucher.VoucherId,
            voucher.Code, voucher.PointsSpent, voucher.ValueEgpAtRedemption, debit.NewAvailablePoints);
    }

    // E43: my vouchers, newest first
    public async Task<(List<VoucherItem> Items, int Total)> ListAsync(
        int userId, string? status, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = ApiResponse.Normalize(page, pageSize);
        var now = DateTime.UtcNow;

        var query = db.Vouchers.AsNoTracking().Include(v => v.Reward).Where(v => v.UserId == userId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            switch (status.Trim().ToLowerInvariant())
            {
                case VoucherStatus.Unused:
                    query = query.Where(v => v.Status == VoucherStatus.Unused && (v.ExpiryDate == null || v.ExpiryDate >= now));
                    break;
                case VoucherStatus.Used:
                    query = query.Where(v => v.Status == VoucherStatus.Used);
                    break;
                case VoucherStatus.Expired:
                    query = query.Where(v => v.Status == VoucherStatus.Expired ||
                                             (v.Status == VoucherStatus.Unused && v.ExpiryDate != null && v.ExpiryDate < now));
                    break;
                default:
                    throw AppException.Validation("status", "Must be one of: unused, used, expired.");
            }
        }

        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(v => v.RedeemedAt).ThenByDescending(v => v.VoucherId)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        var items = rows.Select(v =>
        {
            var shown = v.Status == VoucherStatus.Unused && v.ExpiryDate.HasValue && v.ExpiryDate.Value < now
                ? VoucherStatus.Expired
                : v.Status;

            return new VoucherItem(
                v.VoucherId,
                v.RedemptionId,
                v.Reward.Name,
                v.PointsSpent,
                v.ValueEgpAtRedemption,
                v.Code,
                $"{Settings.QrBaseUrl}/{v.VoucherId}.png",
                v.RedeemedAt,
                shown);
        }).ToList();

        return (items, total); // <-- Was missing
    }

    // Example: CAR-9F2C-1090
    private static string MakeCode(string brand)
    {
        var prefix = new string(brand.Where(char.IsLetterOrDigit).Take(3).ToArray()).ToUpperInvariant();
        if (prefix.Length == 0) prefix = "EVC";
        var hex = Convert.ToHexString(RandomNumberGenerator.GetBytes(2));
        var digits = RandomNumberGenerator.GetInt32(0, 10000).ToString("D4", CultureInfo.InvariantCulture);
        return $"{prefix}-{hex}-{digits}";
    }
}