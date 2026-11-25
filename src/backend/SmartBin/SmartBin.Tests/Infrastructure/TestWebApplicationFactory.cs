using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using SmartBin.Common;
using SmartBin.Context;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services;
using SmartBin.Services.Auth;
using SmartBin.Services.Bins;
using SmartBin.Services.Sessions;
using SmartBin.Services.Surveys;

namespace SmartBin.Tests.Infrastructure
{
    public class FakeStorageService : IStorageService
    {
        public bool ShouldFail { get; set; }

        public Task<string> UploadFileAsync(IFormFile file, string folder = "rewards")
        {
            if (ShouldFail)
            {
                throw new InvalidOperationException("Simulated storage upload failure.");
            }

            return Task.FromResult($"https://cdn.test/{folder}/{Guid.NewGuid():N}_{file.FileName}");
        }
    }

    public class TestMember5InspectionService : IMember5InspectionService
    {
        public Func<CreateInspectionReportsRequestDto, CancellationToken, Task<List<int>>>? CreateHandler { get; set; }
        public Func<int, CancellationToken, Task<List<SessionInspectionReportStatusDto>>>? GetReportsHandler { get; set; }
        public CreateInspectionReportsRequestDto? LastCreateRequest { get; private set; }

        public Task<List<int>> CreateInspectionReportsAsync(
            CreateInspectionReportsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            LastCreateRequest = request;
            if (CreateHandler != null)
            {
                return CreateHandler(request, cancellationToken);
            }

            throw new ApiException(503, "INTEGRATION_UNAVAILABLE", "Member 5 inspection service is unavailable.");
        }

        public Task<List<SessionInspectionReportStatusDto>> GetSessionReportsAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            if (GetReportsHandler != null)
            {
                return GetReportsHandler(sessionId, cancellationToken);
            }

            return Task.FromResult(new List<SessionInspectionReportStatusDto>());
        }
    }

    public class SmartBinTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"smartbin_tests_{Guid.NewGuid():N}.db");

        public FakeStorageService FakeStorage { get; } = new();
        public TestMember5InspectionService Member5Inspection { get; } = new();

        public int Citizen1Id { get; private set; }
        public int Citizen2Id { get; private set; }
        public int SuspendedCitizenId { get; private set; }
        public int CollectorId { get; private set; }

        public int AvailableBinId { get; private set; }
        public string AvailableBinQr { get; private set; } = string.Empty;
        public int Full80BinId { get; private set; }
        public string Full80BinQr { get; private set; } = string.Empty;
        public int NeedsServiceBinId { get; private set; }
        public string NeedsServiceBinQr { get; private set; } = string.Empty;
        public int OfflineBinId { get; private set; }
        public string OfflineBinQr { get; private set; } = string.Empty;

        public static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            // Pre-create the SQLite schema before Program.Main executes role seeding
            var preOptions = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite($"Data Source={_dbPath};Pooling=False")
                .Options;
            using (var preContext = new AppDbContext(preOptions))
            {
                preContext.Database.EnsureCreated();
                preContext.Database.ExecuteSqlRaw("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
            }

            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.RemoveAll<AppDbContext>();

                services.AddDbContext<AppDbContext>(options =>
                    options.UseSqlite($"Data Source={_dbPath};Pooling=False"));

                // Remove background polling services so tests remain deterministic
                var hostedServices = services
                    .Where(d => d.ServiceType == typeof(IHostedService) &&
                                (d.ImplementationType == typeof(SessionTimeoutBackgroundService) ||
                                 d.ImplementationType == typeof(BinHeartbeatSimulatorService)))
                    .ToList();

                foreach (var descriptor in hostedServices)
                {
                    services.Remove(descriptor);
                }

                services.RemoveAll<IStorageService>();
                services.AddSingleton<IStorageService>(FakeStorage);

                services.RemoveAll<IMember5InspectionService>();
                services.AddSingleton<IMember5InspectionService>(Member5Inspection);
            });
        }

        public async Task InitializeAsync()
        {
            using var scope = Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await context.Database.EnsureCreatedAsync();
            await context.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");

            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

            Citizen1Id = (await CreateUserAsync(userManager, "citizen1@test.local", "Citizen One", "USER_CITIZEN", "active")).Id;
            Citizen2Id = (await CreateUserAsync(userManager, "citizen2@test.local", "Citizen Two", "USER_CITIZEN", "active")).Id;
            SuspendedCitizenId = (await CreateUserAsync(userManager, "suspended@test.local", "Suspended User", "USER_CITIZEN", "suspended")).Id;
            CollectorId = (await CreateUserAsync(userManager, "collector@test.local", "Collector User", "OPS_COLLECTOR", "active")).Id;

            await context.Wallets.AddRangeAsync(
                new Wallet { UserId = Citizen1Id, AvailablePoints = 0, LifetimeEarnedPoints = 0 },
                new Wallet { UserId = Citizen2Id, AvailablePoints = 0, LifetimeEarnedPoints = 0 },
                new Wallet { UserId = SuspendedCitizenId, AvailablePoints = 0, LifetimeEarnedPoints = 0 }
            );

            var bin1 = new SmartBin.Models.SmartBin
            {
                SerialNumber = "HW-001",
                QRCode = "QR-BIN-HW-001",
                Status = SmartBinStatus.Available,
                FillLevel = 10,
                District = "Downtown"
            };
            var bin2 = new SmartBin.Models.SmartBin
            {
                SerialNumber = "HW-002",
                QRCode = "QR-BIN-HW-002",
                Status = SmartBinStatus.Full80,
                FillLevel = 82,
                District = "Maadi"
            };
            var bin3 = new SmartBin.Models.SmartBin
            {
                SerialNumber = "HW-003",
                QRCode = "QR-BIN-HW-003",
                Status = SmartBinStatus.NeedsService95,
                FillLevel = 96,
                District = "Nasr City"
            };
            var bin4 = new SmartBin.Models.SmartBin
            {
                SerialNumber = "HW-004",
                QRCode = "QR-BIN-HW-004",
                Status = SmartBinStatus.Offline,
                FillLevel = 20,
                District = "Zamalek"
            };

            await context.SmartBins.AddRangeAsync(bin1, bin2, bin3, bin4);
            await context.SaveChangesAsync();

            AvailableBinId = bin1.BinId;
            AvailableBinQr = bin1.QRCode;
            Full80BinId = bin2.BinId;
            Full80BinQr = bin2.QRCode;
            NeedsServiceBinId = bin3.BinId;
            NeedsServiceBinQr = bin3.QRCode;
            OfflineBinId = bin4.BinId;
            OfflineBinQr = bin4.QRCode;
        }

        public new async Task DisposeAsync()
        {
            await base.DisposeAsync();
            SqliteConnection.ClearAllPools();

            foreach (var file in new[] { _dbPath, $"{_dbPath}-wal", $"{_dbPath}-shm" })
            {
                if (File.Exists(file))
                {
                    try { File.Delete(file); } catch { }
                }
            }
        }

        public string GenerateToken(int userId, string role)
        {
            using var scope = Services.CreateScope();
            var jwtService = scope.ServiceProvider.GetRequiredService<JwtService>();
            return jwtService.GenerateAccessToken(new ApplicationUser { Id = userId, DisplayName = "Test" }, role);
        }

        public HttpClient CreateAuthorizedClient(int userId, string role = "USER_CITIZEN")
        {
            var client = CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", GenerateToken(userId, role));
            return client;
        }

        public HubConnection CreateHubConnection(string? token)
        {
            var hubUrl = new Uri(Server.BaseAddress, "/hubs/sessions");
            return new HubConnectionBuilder()
                .WithUrl(hubUrl, options =>
                {
                    options.HttpMessageHandlerFactory = _ => Server.CreateHandler();
                    if (!string.IsNullOrEmpty(token))
                    {
                        options.AccessTokenProvider = () => Task.FromResult<string?>(token);
                    }
                })
                .Build();
        }

        public async Task<T> ExecuteDbAsync<T>(Func<AppDbContext, Task<T>> action)
        {
            using var scope = Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await action(context);
        }

        public async Task ExecuteDbAsync(Func<AppDbContext, Task> action)
        {
            using var scope = Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await action(context);
        }

        private static async Task<ApplicationUser> CreateUserAsync(
            UserManager<ApplicationUser> userManager,
            string email,
            string displayName,
            string role,
            string accountStatus)
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                DisplayName = displayName,
                EmailConfirmed = true,
                AccountStatus = accountStatus,
                CreatedAt = DateTime.UtcNow,
                LastActiveAt = DateTime.UtcNow
            };

            var createResult = await userManager.CreateAsync(user, "Test@12345!");
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join(", ", createResult.Errors.Select(e => e.Description)));
            }

            var roleResult = await userManager.AddToRoleAsync(user, role);
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(string.Join(", ", roleResult.Errors.Select(e => e.Description)));
            }

            return user;
        }
    }
}
