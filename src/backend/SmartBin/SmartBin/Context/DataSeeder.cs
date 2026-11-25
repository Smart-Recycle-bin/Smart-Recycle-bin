using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Context
{
    public static class DataSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            // 1. Roles
            string[] roles = { "USER_CITIZEN", "OPS_COLLECTOR", "SYS_ADMIN" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new ApplicationRole { Name = role });
                }
            }

            // 2. Dev Users
            // A. Citizen
            var citizenEmail = "citizen@ecobin.com";
            var citizen = await userManager.FindByEmailAsync(citizenEmail);
            if (citizen == null)
            {
                citizen = new ApplicationUser
                {
                    UserName = citizenEmail,
                    Email = citizenEmail,
                    DisplayName = "Youssef Mohamed",
                    PhoneNumber = "+20 100 123 4567",
                    EmailConfirmed = true,
                    AccountStatus = "active",
                    CreatedAt = DateTime.UtcNow,
                    LastActiveAt = DateTime.UtcNow
                };
                var createResult = await userManager.CreateAsync(citizen, "Citizen123!");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(citizen, "USER_CITIZEN");
                }
            }

            // Ensure Citizen Wallet
            if (citizen != null)
            {
                var wallet = await context.Wallets.FirstOrDefaultAsync(w => w.UserId == citizen.Id);
                if (wallet == null)
                {
                    wallet = new Wallet
                    {
                        UserId = citizen.Id,
                        AvailablePoints = 1420,
                        LifetimeEarnedPoints = 3120
                    };
                    await context.Wallets.AddAsync(wallet);
                    await context.SaveChangesAsync();

                    // Seed sample ledger entries
                    var ledger1 = new LedgerTransaction
                    {
                        WalletId = wallet.WalletId,
                        TransactionType = LedgerTransactionType.Credit,
                        PointsDelta = 50,
                        RunningBalance = 1420,
                        Source = "session_confirm",
                        CreatedAt = DateTime.UtcNow.AddHours(-2)
                    };
                    var ledger2 = new LedgerTransaction
                    {
                        WalletId = wallet.WalletId,
                        TransactionType = LedgerTransactionType.Debit,
                        PointsDelta = -100,
                        RunningBalance = 1370,
                        Source = "reward_redemption",
                        CreatedAt = DateTime.UtcNow.AddDays(-1)
                    };
                    await context.LedgerTransactions.AddRangeAsync(ledger1, ledger2);
                    await context.SaveChangesAsync();
                }
            }

            // B. Admin
            var adminEmail = "admin@ecobin.com";
            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin == null)
            {
                admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    DisplayName = "System Admin",
                    EmailConfirmed = true,
                    AccountStatus = "active",
                    CreatedAt = DateTime.UtcNow,
                    LastActiveAt = DateTime.UtcNow
                };
                var createResult = await userManager.CreateAsync(admin, "Admin123!");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(admin, "SYS_ADMIN");
                }
            }

            // C. Collector
            var collectorEmail = "collector@ecobin.com";
            var collector = await userManager.FindByEmailAsync(collectorEmail);
            if (collector == null)
            {
                collector = new ApplicationUser
                {
                    UserName = collectorEmail,
                    Email = collectorEmail,
                    DisplayName = "EcoBin Collector",
                    EmailConfirmed = true,
                    AccountStatus = "active",
                    CreatedAt = DateTime.UtcNow,
                    LastActiveAt = DateTime.UtcNow
                };
                var createResult = await userManager.CreateAsync(collector, "Collector123!");
                if (createResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(collector, "OPS_COLLECTOR");
                }
            }

            // 3. Smart Bins
            if (!await context.SmartBins.AnyAsync())
            {
                var bins = new List<Models.SmartBin>
                {
                    new()
                    {
                        SerialNumber = "BIN-E2E-101",
                        QRCode = "BIN-101",
                        District = "Downtown Cairo",
                        Latitude = 30.0444m,
                        Longitude = 31.2357m,
                        Status = "AVAILABLE",
                        FillLevel = 12m,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SerialNumber = "BIN-E2E-210",
                        QRCode = "BIN-210",
                        District = "Ramses Hub",
                        Latitude = 30.0520m,
                        Longitude = 31.2410m,
                        Status = "AVAILABLE",
                        FillLevel = 34m,
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        SerialNumber = "BIN-E2E-420",
                        QRCode = "BIN-420",
                        District = "Zamalek",
                        Latitude = 30.0600m,
                        Longitude = 31.2200m,
                        Status = "AVAILABLE",
                        FillLevel = 55m,
                        CreatedAt = DateTime.UtcNow
                    }
                };
                await context.SmartBins.AddRangeAsync(bins);
                await context.SaveChangesAsync();
            }

            // 4. Reward Categories & Rewards
            if (!await context.RewardCategories.AnyAsync())
            {
                var catTelecom = new RewardCategory { Name = "Telecom", CreatedAt = DateTime.UtcNow };
                var catRetail = new RewardCategory { Name = "Supermarket", CreatedAt = DateTime.UtcNow };
                var catTransit = new RewardCategory { Name = "Transportation", CreatedAt = DateTime.UtcNow };
                await context.RewardCategories.AddRangeAsync(catTelecom, catRetail, catTransit);
                await context.SaveChangesAsync();

                var rewards = new List<Reward>
                {
                    new()
                    {
                        CategoryId = catTelecom.CategoryId,
                        Name = "Vodafone Internet E£ 5 Pounds",
                        Description = "Get 500MB high-speed internet voucher redeemable via Vodafone app.",
                        PointsCost = 500,
                        StockQuantity = 100,
                        IsActive = true,
                        ImageUrl = "assets/images/vodafone_logo.png",
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        CategoryId = catRetail.CategoryId,
                        Name = "Carrefour Voucher E£ 10 Pounds",
                        Description = "Digital shopping voucher valid at all Carrefour stores across Egypt.",
                        PointsCost = 1000,
                        StockQuantity = 50,
                        IsActive = true,
                        ImageUrl = "assets/images/carrefour_logo.png",
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        CategoryId = catTransit.CategoryId,
                        Name = "Metro Free Ticket",
                        Description = "One free single-trip ticket for Cairo Metro lines 1, 2, or 3.",
                        PointsCost = 200,
                        StockQuantity = 200,
                        IsActive = true,
                        ImageUrl = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600",
                        CreatedAt = DateTime.UtcNow
                    }
                };
                await context.Rewards.AddRangeAsync(rewards);
                await context.SaveChangesAsync();
            }
        }
    }
}
