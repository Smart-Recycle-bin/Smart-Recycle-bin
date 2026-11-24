using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using Microsoft.EntityFrameworkCore;
using System;

namespace EcoBin.Api;

public interface ICatalogService
{
    Task<(List<CatalogCard> Items, int Total)> BrowseAsync(int userId, int? categoryId, bool affordableOnly, int page, int pageSize, CancellationToken ct);
    Task<CatalogDetail> GetDetailAsync(int itemId, CancellationToken ct);
}

public class CatalogService(EcoBinDbContext db, IWalletService wallet) : ICatalogService
{
    // E41: one card per category (brand).
    public async Task<(List<CatalogCard> Items, int Total)> BrowseAsync(
        int userId, int? categoryId, bool affordableOnly, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = ApiResponse.Normalize(page, pageSize);
        var now = DateTime.UtcNow;

        var rewards = await db.Rewards.AsNoTracking().Include(r => r.Category)
            .Where(r => r.IsActive
                     && r.Category.IsActive
                     && (r.ValidFrom == null || r.ValidFrom <= now)
                     && (r.ValidUntil == null || r.ValidUntil >= now)
                     && (categoryId == null || r.CategoryId == categoryId))
            .ToListAsync(ct);

        int? available = affordableOnly ? await wallet.GetAvailablePointsAsync(userId, ct) : null;

        var groups = rewards
            .GroupBy(r => r.CategoryId)
            .Select(g => g.OrderBy(r => r.PointsCost).ThenBy(r => r.RewardId).ToList())
            .Where(options => available == null || options.Any(o => o.StockQuantity > 0 && o.PointsCost <= available))
            .Select(options => new
            {
                Options = options,
                Pick = options.FirstOrDefault(o => o.StockQuantity > 0) ?? options[0]
            })
            .OrderBy(x => x.Pick.PointsCost).ThenBy(x => x.Pick.CategoryId)
            .ToList();

        var cards = groups.Skip((page - 1) * pageSize).Take(pageSize).Select(x =>
            new CatalogCard(
                x.Pick.RewardId,
                x.Pick.CategoryId,
                x.Pick.Category.Name,
                x.Pick.Name,
                x.Pick.Category.LogoUrl ?? x.Pick.ImageUrl,
                x.Pick.PointsCost,
                x.Options.Count,
                x.Pick.StockQuantity > 0 ? "in_stock" : "out_of_stock"))
            .ToList();

        return (cards, groups.Count);
    }

    // E45
    public async Task<CatalogDetail> GetDetailAsync(int itemId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        var item = await db.Rewards.AsNoTracking().Include(r => r.Category)
            .FirstOrDefaultAsync(r => r.RewardId == itemId
                                   && r.IsActive
                                   && r.Category.IsActive
                                   && (r.ValidFrom == null || r.ValidFrom <= now)
                                   && (r.ValidUntil == null || r.ValidUntil >= now), ct)
            ?? throw AppException.NotFound("Catalog item not found.");

        var options = await db.Rewards.AsNoTracking()
            .Where(r => r.CategoryId == item.CategoryId
                     && r.IsActive
                     && (r.ValidFrom == null || r.ValidFrom <= now)
                     && (r.ValidUntil == null || r.ValidUntil >= now))
            .OrderBy(r => r.PointsCost).ThenBy(r => r.RewardId)
            .Select(r => new CatalogOption(r.RewardId, r.Name, r.PointsCost, r.StockQuantity > 0))
            .ToListAsync(ct);

        return new CatalogDetail(
            item.RewardId,
            item.CategoryId,
            item.Category.Name,
            item.Name,
            item.Description,
            item.Category.LogoUrl ?? item.ImageUrl,
            item.PointsCost,
            item.StockQuantity > 0,
            item.ValidUntil,
            options);
    }
}

//public class CatalogService(EcoBinDbContext db, IWalletService wallet) : ICatalogService
//{
//    // E41: one card per category (brand).
//    public async Task<(List<CatalogCard> Items, int Total)> BrowseAsync(
//        int userId, int? categoryId, bool affordableOnly, int page, int pageSize, CancellationToken ct)
//    {
//        (page, pageSize) = ApiResponse.Normalize(page, pageSize);

//        // The catalog is small, so we load the active rewards and group them in memory (easy to read).
//        var rewards = await db.Rewards.AsNoTracking().Include(r => r.Category)
//            .Where(r => r.IsActive && r.Category.IsActive && (categoryId == null || r.CategoryId == categoryId))
//            .ToListAsync(ct);

//        int? available = affordableOnly ? await wallet.GetAvailablePointsAsync(userId, ct) : null;

//        var groups = rewards
//            .GroupBy(r => r.CategoryId)
//            .Select(g => g.OrderBy(r => r.PointsCost).ThenBy(r => r.RewardId).ToList())   // options, cheapest first
//                                                                                          // affordableOnly: keep the brand if at least one in-stock option is affordable
//            .Where(options => available == null || options.Any(o => o.StockQuantity > 0 && o.PointsCost <= available))
//            .OrderBy(options => options[0].PointsCost).ThenBy(options => options[0].CategoryId)
//            .ToList();

//        var cards = groups.Skip((page - 1) * pageSize).Take(pageSize).Select(options =>
//        {
//            var pick = options.FirstOrDefault(o => o.StockQuantity > 0) ?? options[0];   // cheapest in-stock option
//            return new CatalogCard(pick.RewardId, pick.CategoryId, pick.Category.Name, pick.Name, pick.ImageUrl,
//                pick.PointsCost, options.Count, pick.StockQuantity > 0 ? "in_stock" : "out_of_stock");
//        }).ToList();

//        return (cards, groups.Count);
//    }

//    // E45
//    public async Task<CatalogDetail> GetDetailAsync(int itemId, CancellationToken ct)
//    {
//        var item = await db.Rewards.AsNoTracking().Include(r => r.Category)
//            .FirstOrDefaultAsync(r => r.RewardId == itemId && r.IsActive && r.Category.IsActive, ct)
//            ?? throw AppException.NotFound("Catalog item not found.");

//        var options = await db.Rewards.AsNoTracking()
//            .Where(r => r.CategoryId == item.CategoryId && r.IsActive)
//            .OrderBy(r => r.PointsCost).ThenBy(r => r.RewardId)
//            .Select(r => new CatalogOption(r.RewardId, r.Name, r.PointsCost, r.StockQuantity > 0))
//            .ToListAsync(ct);

//        return new CatalogDetail(item.RewardId, item.CategoryId, item.Category.Name, item.Name, item.Description,
//            item.ImageUrl, item.PointsCost, item.StockQuantity > 0, item.ValidUntil, options);
//    }
//}
