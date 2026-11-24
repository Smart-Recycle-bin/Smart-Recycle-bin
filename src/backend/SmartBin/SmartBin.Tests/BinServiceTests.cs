using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Dtos.Bins;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services;
using SmartBin.Services.Bins;
using Xunit;

namespace SmartBin.Tests
{
    public class BinServiceTests
    {
        private AppDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            return context;
        }

        [Fact]
        public async Task E60_CitizenBins_ReturnsSimplifiedStatus_And_SortsByDistance()
        {
            var context = CreateInMemoryDbContext();
            context.SmartBins.AddRange(
                new SmartBin.Models.SmartBin
                {
                    BinId = 1,
                    SerialNumber = "BIN-001",
                    QRCode = "QR-001",
                    Latitude = 30.0444m,
                    Longitude = 31.2357m,
                    Status = SmartBinStatus.Available,
                    FillLevel = 10,
                    District = "Downtown"
                },
                new SmartBin.Models.SmartBin
                {
                    BinId = 2,
                    SerialNumber = "BIN-002",
                    QRCode = "QR-002",
                    Latitude = 30.0500m,
                    Longitude = 31.2400m,
                    Status = SmartBinStatus.Full80, // Should be UNAVAILABLE for citizen
                    FillLevel = 82,
                    District = "Downtown"
                }
            );
            await context.SaveChangesAsync();

            var service = new BinService(context, new Member5AnalyticsService());

            var result = await service.GetNearbyBinsAsync(30.0444, 31.2357, radiusKm: 5);

            Assert.Equal(2, result.Count);
            Assert.Equal("AVAILABLE", result[0].Status);
            Assert.Equal("UNAVAILABLE", result[1].Status);
            Assert.Equal("Bin#001", result[0].Name);
        }

        [Fact]
        public async Task E61_BinDetails_CitizenVsAdmin_RoleBasedVisibility()
        {
            var context = CreateInMemoryDbContext();
            context.SmartBins.Add(new SmartBin.Models.SmartBin
            {
                BinId = 45,
                SerialNumber = "BIN-045",
                QRCode = "QR-045",
                Latitude = 30.0444m,
                Longitude = 31.2357m,
                Status = SmartBinStatus.NeedsService95,
                FillLevel = 96,
                District = "Downtown Cairo",
                CollectorId = 101
            });
            await context.SaveChangesAsync();

            var service = new BinService(context, new Member5AnalyticsService());

            // Citizen role
            var citizenView = await service.GetBinDetailsAsync(45, "USER_CITIZEN");
            Assert.Equal("UNAVAILABLE", citizenView.Status);
            Assert.Null(citizenView.AssignedCollectorId);
            Assert.Null(citizenView.PredictedFullAt);

            // Admin role
            var adminView = await service.GetBinDetailsAsync(45, "SYS_ADMIN");
            Assert.Equal(SmartBinStatus.NeedsService95, adminView.Status);
            Assert.Equal(101, adminView.AssignedCollectorId);
            Assert.NotNull(adminView.PredictedFullAt);
        }

        [Fact]
        public async Task E64_SearchBins_CalculatesDistanceAndWalkingTime()
        {
            var context = CreateInMemoryDbContext();
            context.SmartBins.Add(new SmartBin.Models.SmartBin
            {
                BinId = 420,
                SerialNumber = "BIN-420",
                QRCode = "QR-420",
                Latitude = 30.0444m,
                Longitude = 31.2357m,
                District = "El Tahrir, Downtown",
                Status = SmartBinStatus.Available,
                FillLevel = 34
            });
            await context.SaveChangesAsync();

            var service = new BinService(context, new Member5AnalyticsService());

            var results = await service.SearchBinsAsync("Tahrir", 30.0440, 31.2350, limit: 10);

            Assert.Single(results);
            Assert.Equal(420, results[0].BinId);
            Assert.NotNull(results[0].DistanceMeters);
            Assert.NotNull(results[0].WalkingTimeMinutes);
            Assert.True(results[0].DistanceMeters > 0);
        }

        [Fact]
        public async Task E51_RegisterBin_EnforcesUniqueDeviceSerial()
        {
            var context = CreateInMemoryDbContext();
            context.SmartBins.Add(new SmartBin.Models.SmartBin
            {
                BinId = 1,
                SerialNumber = "SWB-HW-0045",
                QRCode = "QR-45",
                Status = SmartBinStatus.Available
            });
            await context.SaveChangesAsync();

            var service = new BinService(context, new Member5AnalyticsService());

            var request = new RegisterBinRequestDto
            {
                DeviceSerial = "SWB-HW-0045",
                DistrictArea = "Downtown",
                Latitude = 30.0444m,
                Longitude = 31.2357m,
                CapacityThresholdKg = 50
            };

            var ex = await Assert.ThrowsAsync<ApiException>(() => service.RegisterBinAsync(request));
            Assert.Equal("DEVICE_ALREADY_REGISTERED", ex.ErrorCode);
            Assert.Equal(409, ex.StatusCode);
        }
    }
}
