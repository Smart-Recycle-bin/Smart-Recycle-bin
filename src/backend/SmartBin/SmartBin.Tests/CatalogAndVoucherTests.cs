using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class CatalogAndVoucherTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task BrowseCatalog_GroupsByCategory_FiltersAffordable_AndReturnsDetail()
        {
            int telecomCatId = 0;
            int cheapRewardId = 0;

            await _factory.ExecuteDbAsync(async db =>
            {
                var cat1 = new RewardCategory { Name = $"CatCheap_{Guid.NewGuid():N}", IsActive = true };
                var cat2 = new RewardCategory { Name = $"CatExpensive_{Guid.NewGuid():N}", IsActive = true };
                db.RewardCategories.AddRange(cat1, cat2);
                await db.SaveChangesAsync();

                telecomCatId = cat1.CategoryId;

                var r1 = new Reward { Name = "10 EGP Top-up", CategoryId = cat1.CategoryId, PointsCost = 100, StockQuantity = 5, IsActive = true };
                var r2 = new Reward { Name = "20 EGP Top-up", CategoryId = cat1.CategoryId, PointsCost = 200, StockQuantity = 3, IsActive = true };
                var r3 = new Reward { Name = "500 EGP Voucher", CategoryId = cat2.CategoryId, PointsCost = 5000, StockQuantity = 2, IsActive = true };
                db.Rewards.AddRange(r1, r2, r3);

                var wallet = await db.Wallets.FirstAsync(w => w.UserId == _factory.Citizen1Id);
                wallet.AvailablePoints = 150;
                await db.SaveChangesAsync();

                cheapRewardId = r1.RewardId;
            });

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);

            var affordableResp = await client.GetAsync("/api/v1/catalog?affordableOnly=true&page=1&pageSize=10");
            Assert.Equal(HttpStatusCode.OK, affordableResp.StatusCode);

            using var doc = JsonDocument.Parse(await affordableResp.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");
            Assert.Contains(data.EnumerateArray(), x => x.GetProperty("categoryId").GetInt32() == telecomCatId && x.GetProperty("optionsCount").GetInt32() == 2);
            Assert.DoesNotContain(data.EnumerateArray(), x => x.GetProperty("startingPointsCost").GetInt32() == 5000);

            var detailResp = await client.GetAsync($"/api/v1/catalog/{cheapRewardId}");
            Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);
            using var detailDoc = JsonDocument.Parse(await detailResp.Content.ReadAsStringAsync());
            Assert.Equal(2, detailDoc.RootElement.GetProperty("data").GetProperty("options").GetArrayLength());
        }

        [Fact]
        public async Task RedeemAndListVouchers_EnforcesSuspension_InsufficientPoints_AndStatusFilters()
        {
            int rewardId = 0;
            await _factory.ExecuteDbAsync(async db =>
            {
                var cat = new RewardCategory { Name = $"Retail_{Guid.NewGuid():N}", IsActive = true };
                db.RewardCategories.Add(cat);
                await db.SaveChangesAsync();

                var reward = new Reward { Name = "Retail 10 EGP", CategoryId = cat.CategoryId, PointsCost = 200, StockQuantity = 5, IsActive = true };
                db.Rewards.Add(reward);

                var wallet = await db.Wallets.FirstAsync(w => w.UserId == _factory.Citizen1Id);
                wallet.AvailablePoints = 250;

                db.Vouchers.Add(new Voucher
                {
                    RedemptionId = 9001,
                    Code = "OLD-1111-2222",
                    UserId = _factory.Citizen1Id,
                    RewardId = reward.RewardId,
                    IssuedAt = DateTime.UtcNow.AddDays(-10),
                    RedeemedAt = DateTime.UtcNow.AddDays(-10),
                    ExpiryDate = DateTime.UtcNow.AddDays(-1),
                    Status = VoucherStatus.Unused,
                    PointsSpent = 50,
                    ValueEgpAtRedemption = 0.50m
                });

                await db.SaveChangesAsync();
                rewardId = reward.RewardId;
            });

            using var suspendedClient = _factory.CreateAuthorizedClient(_factory.SuspendedCitizenId);
            var suspendedResp = await suspendedClient.PostAsJsonAsync($"/api/v1/catalog/{rewardId}/redemptions", new { });
            Assert.Equal(HttpStatusCode.Forbidden, suspendedResp.StatusCode);

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var okResp = await client.PostAsJsonAsync($"/api/v1/catalog/{rewardId}/redemptions", new { });
            Assert.Equal(HttpStatusCode.Created, okResp.StatusCode);

            var insufficientResp = await client.PostAsJsonAsync($"/api/v1/catalog/{rewardId}/redemptions", new { });
            Assert.Equal(HttpStatusCode.Conflict, insufficientResp.StatusCode);

            var unusedResp = await client.GetAsync("/api/v1/vouchers?status=unused");
            Assert.Equal(HttpStatusCode.OK, unusedResp.StatusCode);
            using var unusedDoc = JsonDocument.Parse(await unusedResp.Content.ReadAsStringAsync());
            Assert.Equal(1, unusedDoc.RootElement.GetProperty("data").GetArrayLength());

            var expiredResp = await client.GetAsync("/api/v1/vouchers?status=expired");
            Assert.Equal(HttpStatusCode.OK, expiredResp.StatusCode);
            using var expiredDoc = JsonDocument.Parse(await expiredResp.Content.ReadAsStringAsync());
            Assert.Equal(1, expiredDoc.RootElement.GetProperty("data").GetArrayLength());
            Assert.Equal("expired", expiredDoc.RootElement.GetProperty("data")[0].GetProperty("status").GetString());
        }
    }
}