using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartBin.DTOs.Support;
using SmartBin.Models;
using SmartBin.Services.Auth;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class AuthAndSupportTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task VerifyResetOtp_WithValidOtp_ReturnsSuccess()
        {
            using var scope = _factory.Services.CreateScope();
            var otpService = scope.ServiceProvider.GetRequiredService<OtpService>();
            string validOtp = "12345";
            string hash = otpService.HashOtp(_factory.Citizen1Id, "password_reset", validOtp);

            await _factory.ExecuteDbAsync(async db =>
            {
                var otp = new AuthOtp
                {
                    UserId = _factory.Citizen1Id,
                    Purpose = "password_reset",
                    OtpHash = hash,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                    FailedAttempts = 0
                };
                db.AuthOtps.Add(otp);
                await db.SaveChangesAsync();
            });

            using var client = _factory.CreateClient();
            var response = await client.PostAsJsonAsync("/api/v1/auth/verify-reset-otp", new
            {
                email = "citizen1@test.local",
                otp = validOtp
            });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
        }

        [Fact]
        public async Task VerifyResetOtp_WithInvalidOrExpiredOtp_ReturnsBadRequest()
        {
            using var scope = _factory.Services.CreateScope();
            var otpService = scope.ServiceProvider.GetRequiredService<OtpService>();
            string validOtp = "12345";
            string hash = otpService.HashOtp(_factory.Citizen1Id, "password_reset", validOtp);

            await _factory.ExecuteDbAsync(async db =>
            {
                var otp = new AuthOtp
                {
                    UserId = _factory.Citizen1Id,
                    Purpose = "password_reset",
                    OtpHash = hash,
                    CreatedAt = DateTime.UtcNow.AddMinutes(-20),
                    ExpiresAt = DateTime.UtcNow.AddMinutes(-10), // expired
                    FailedAttempts = 0
                };
                db.AuthOtps.Add(otp);
                await db.SaveChangesAsync();
            });

            using var client = _factory.CreateClient();
            var expiredResponse = await client.PostAsJsonAsync("/api/v1/auth/verify-reset-otp", new
            {
                email = "citizen1@test.local",
                otp = validOtp
            });

            Assert.Equal(HttpStatusCode.BadRequest, expiredResponse.StatusCode);

            // Also test wrong OTP
            var wrongOtpResponse = await client.PostAsJsonAsync("/api/v1/auth/verify-reset-otp", new
            {
                email = "citizen1@test.local",
                otp = "99999"
            });

            Assert.Equal(HttpStatusCode.BadRequest, wrongOtpResponse.StatusCode);
        }

        [Fact]
        public async Task SupportTickets_CreateTicket_ReturnsTicketDetailsWhenValid()
        {
            using var client = _factory.CreateClient();
            var validResponse = await client.PostAsJsonAsync("/api/v1/support/tickets", new CreateSupportTicketRequestDto
            {
                Category = "technical",
                Description = "When scanning QR code it failed to open camera.",
                SessionId = "1"
            });
            Assert.Equal(HttpStatusCode.OK, validResponse.StatusCode);

            using var doc = JsonDocument.Parse(await validResponse.Content.ReadAsStringAsync());
            Assert.True(doc.RootElement.GetProperty("success").GetBoolean());
            var data = doc.RootElement.GetProperty("data");
            Assert.False(string.IsNullOrWhiteSpace(data.GetProperty("ticketId").GetString()));
            Assert.Equal("open", data.GetProperty("status").GetString());

            // Empty description validation check
            var invalidResponse = await client.PostAsJsonAsync("/api/v1/support/tickets", new CreateSupportTicketRequestDto
            {
                Category = "general",
                Description = ""
            });
            Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
        }

        [Fact]
        public async Task Catalog_Redemption_DecrementsStock_AndDebitsPointsAtomically()
        {
            int rewardId = 0;
            await _factory.ExecuteDbAsync(async db =>
            {
                var category = new RewardCategory
                {
                    Name = $"TestCategory_{Guid.NewGuid():N}",
                    IsActive = true
                };
                db.RewardCategories.Add(category);
                await db.SaveChangesAsync();

                var reward = new Reward
                {
                    Name = "Coffee Voucher",
                    Description = "Free coffee",
                    CategoryId = category.CategoryId,
                    PointsCost = 100,
                    StockQuantity = 1,
                    IsActive = true
                };
                db.Rewards.Add(reward);
                await db.SaveChangesAsync();
                rewardId = reward.RewardId;

                var wallet = await db.Wallets.FirstAsync(w => w.UserId == _factory.Citizen1Id);
                wallet.AvailablePoints = 150;
                wallet.LifetimeEarnedPoints = 150;
                await db.SaveChangesAsync();
            });

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);

            // First redemption should succeed
            var response1 = await client.PostAsJsonAsync($"/api/v1/catalog/{rewardId}/redemptions", new { });
            Assert.Equal(HttpStatusCode.OK, response1.StatusCode);

            // Stock is now 0; second redemption should fail with 400 Bad Request (out of stock)
            var response2 = await client.PostAsJsonAsync($"/api/v1/catalog/{rewardId}/redemptions", new { });
            Assert.Equal(HttpStatusCode.BadRequest, response2.StatusCode);

            // Verify final wallet points and stock
            await _factory.ExecuteDbAsync(async db =>
            {
                var reward = await db.Rewards.FindAsync(rewardId);
                Assert.NotNull(reward);
                Assert.Equal(0, reward.StockQuantity);

                var wallet = await db.Wallets.FirstAsync(w => w.UserId == _factory.Citizen1Id);
                Assert.Equal(50, wallet.AvailablePoints); // Debited once: 150 - 100 = 50
            });
        }
    }
}
