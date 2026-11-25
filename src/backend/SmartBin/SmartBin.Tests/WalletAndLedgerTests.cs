using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartBin.Common;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services;
using SmartBin.Services.Wallets;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class WalletAndLedgerTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task GetBalance_ReturnsOnlyAuthenticatedUserWallet()
        {
            await _factory.ExecuteDbAsync(async db =>
            {
                await db.Wallets.Where(w => w.UserId == _factory.Citizen1Id)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(w => w.AvailablePoints, 340)
                        .SetProperty(w => w.LifetimeEarnedPoints, 1250));
                await db.Wallets.Where(w => w.UserId == _factory.Citizen2Id)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(w => w.AvailablePoints, 999)
                        .SetProperty(w => w.LifetimeEarnedPoints, 2000));
            });

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var response = await client.GetAsync("/api/v1/wallet/balance");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");
            Assert.Equal(340, data.GetProperty("availablePoints").GetInt32());
            Assert.Equal(1250, data.GetProperty("lifetimeEarnedPoints").GetInt32());
        }

        [Fact]
        public async Task GetLedger_IsIsolatedPaginatedSignedAndMapsSourcesCorrectly()
        {
            await _factory.ExecuteDbAsync(async db =>
            {
                var w1 = await db.Wallets.FirstAsync(w => w.UserId == _factory.Citizen1Id);
                var w2 = await db.Wallets.FirstAsync(w => w.UserId == _factory.Citizen2Id);

                var s1 = new DisposalSession
                {
                    UserId = _factory.Citizen1Id,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow.AddMinutes(-10),
                    EndTime = DateTime.UtcNow.AddMinutes(-9),
                    Status = SessionStatus.Terminated,
                    TotalPoints = 25,
                    PointsStatus = PointsStatus.Awarded
                };
                db.DisposalSessions.Add(s1);
                await db.SaveChangesAsync();

                db.LedgerTransactions.AddRange(
                    new LedgerTransaction
                    {
                        WalletId = w1.WalletId,
                        SessionId = s1.SessionId,
                        TransactionType = LedgerTransactionType.Credit,
                        PointsDelta = 25,
                        RunningBalance = 25,
                        Source = LedgerSource.SessionAward,
                        CreatedAt = DateTime.UtcNow.AddMinutes(-5)
                    },
                    new LedgerTransaction
                    {
                        WalletId = w1.WalletId,
                        VoucherId = 552,
                        TransactionType = LedgerTransactionType.Debit,
                        PointsDelta = -10,
                        RunningBalance = 15,
                        Source = LedgerSource.VoucherRedemption,
                        CreatedAt = DateTime.UtcNow.AddMinutes(-1)
                    },
                    new LedgerTransaction
                    {
                        WalletId = w2.WalletId,
                        VoucherId = 888,
                        TransactionType = LedgerTransactionType.Debit,
                        PointsDelta = -50,
                        RunningBalance = 50,
                        Source = LedgerSource.VoucherRedemption,
                        CreatedAt = DateTime.UtcNow
                    });

                await db.SaveChangesAsync();
            });

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);

            var resp = await client.GetAsync("/api/v1/wallet/ledger?page=1&pageSize=10");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");
            Assert.Equal(2, data.GetArrayLength());

            // Newest first: debit voucher entry
            var first = data[0];
            Assert.Equal("debit", first.GetProperty("entryType").GetString());
            Assert.Equal(-10, first.GetProperty("pointsDelta").GetInt32());
            Assert.Equal(15, first.GetProperty("balanceAfter").GetInt32());
            Assert.Equal("voucher_redemption", first.GetProperty("source").GetString());
            Assert.Equal(552, first.GetProperty("sourceId").GetInt32());
            Assert.Equal(JsonValueKind.Null, first.GetProperty("binId").ValueKind);

            // Older: credit session entry
            var second = data[1];
            Assert.Equal("credit", second.GetProperty("entryType").GetString());
            Assert.Equal(25, second.GetProperty("pointsDelta").GetInt32());
            Assert.Equal(25, second.GetProperty("balanceAfter").GetInt32());
            Assert.Equal("session_award", second.GetProperty("source").GetString());
            Assert.Equal(_factory.AvailableBinId, second.GetProperty("binId").GetInt32());

            var meta = doc.RootElement.GetProperty("meta");
            Assert.Equal(2, meta.GetProperty("totalItems").GetInt32());
            Assert.Equal(1, meta.GetProperty("totalPages").GetInt32());

            // Invalid pageSize -> 400
            var badResp = await client.GetAsync("/api/v1/wallet/ledger?page=1&pageSize=101");
            Assert.Equal(HttpStatusCode.BadRequest, badResp.StatusCode);
        }

        [Fact]
        public async Task DebitPointsForVoucher_ProtectsAgainstInsufficientBalanceAndConcurrency()
        {
            await _factory.ExecuteDbAsync(async db =>
            {
                await db.Wallets.Where(w => w.UserId == _factory.Citizen1Id)
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(w => w.AvailablePoints, 100)
                        .SetProperty(w => w.LifetimeEarnedPoints, 200));
            });

            // Concurrent 80-point debits against 100 available points: exactly one must succeed
            var tasks = new[]
            {
                Task.Run(async () =>
                {
                    using var scope = _factory.Services.CreateScope();
                    var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    try
                    {
                        await walletService.DebitPointsForVoucherAsync(_factory.Citizen1Id, 101, 80);
                        return true;
                    }
                    catch (ApiException ex) when (ex.ErrorCode == "INSUFFICIENT_POINTS")
                    {
                        return false;
                    }
                }),
                Task.Run(async () =>
                {
                    using var scope = _factory.Services.CreateScope();
                    var walletService = scope.ServiceProvider.GetRequiredService<IWalletService>();
                    try
                    {
                        await walletService.DebitPointsForVoucherAsync(_factory.Citizen1Id, 102, 80);
                        return true;
                    }
                    catch (ApiException ex) when (ex.ErrorCode == "INSUFFICIENT_POINTS")
                    {
                        return false;
                    }
                })
            };

            var results = await Task.WhenAll(tasks);
            Assert.Equal(1, results.Count(r => r));
            Assert.Equal(1, results.Count(r => !r));

            var wallet = await _factory.ExecuteDbAsync(db =>
                db.Wallets.AsNoTracking().FirstAsync(w => w.UserId == _factory.Citizen1Id));
            Assert.Equal(20, wallet.AvailablePoints);
            Assert.Equal(200, wallet.LifetimeEarnedPoints);
        }
    }
}
