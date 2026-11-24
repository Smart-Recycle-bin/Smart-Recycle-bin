using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Dtos.Bins;
using SmartBin.Models;
using SmartBin.Services;
using SmartBin.Services.Bins;
using System.Text;
using Xunit;

namespace SmartBin.Tests
{
    public class IngestionServiceTests
    {
        private AppDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            var context = new AppDbContext(options);
            context.WasteTypes.AddRange(
                new WasteType { WasteTypeId = 1, Name = "PLASTIC", BasePoints = 15 },
                new WasteType { WasteTypeId = 2, Name = "METAL", BasePoints = 20 },
                new WasteType { WasteTypeId = 5, Name = "TRASH", BasePoints = 1 }
            );
            context.SaveChanges();
            return context;
        }

        private IFormFile CreateMockFormFile(string fileName, string contentType)
        {
            var bytes = Encoding.UTF8.GetBytes("fake image payload");
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "image", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType
            };
        }

        [Fact]
        public async Task E21_IngestItem_SuccessfulIngestion_ResetsWindowAndPersistsItem()
        {
            var context = CreateInMemoryDbContext();
            var sessionService = new SessionCoordinationService();
            var classificationAdapter = new ClassificationAdapter();
            var ingestionService = new IngestionService(context, sessionService, classificationAdapter);

            var file = CreateMockFormFile("plastic_bottle.jpg", "image/jpeg");
            var request = new IngestItemRequestDto
            {
                Image = file,
                CapturedAt = DateTime.UtcNow
            };

            var result = await ingestionService.IngestItemAsync(9021, request, deviceKey: "test-device-key");

            Assert.Equal(9021, result.SessionId);
            Assert.Equal("PLASTIC", result.WasteType);
            Assert.Equal(15, result.EstimatedPoints);
            Assert.True(result.ConfidenceScore > 0.9m);
            Assert.True(result.WindowExpiresAt > DateTime.UtcNow);

            // Verify persisted in DB
            var item = await context.DisposalItems.FirstOrDefaultAsync(i => i.ItemId == result.ItemId);
            Assert.NotNull(item);
            Assert.Equal(15, item.EstimatedPoints);
        }

        [Fact]
        public async Task E21_IngestItem_RejectsInactiveSession_With409()
        {
            var context = CreateInMemoryDbContext();
            var sessionService = new SessionCoordinationService();
            var classificationAdapter = new ClassificationAdapter();
            var ingestionService = new IngestionService(context, sessionService, classificationAdapter);

            var file = CreateMockFormFile("can.png", "image/png");
            var request = new IngestItemRequestDto
            {
                Image = file,
                CapturedAt = DateTime.UtcNow
            };

            // Session 1002 is configured as expired/inactive in SessionCoordinationService
            var ex = await Assert.ThrowsAsync<ApiException>(() =>
                ingestionService.IngestItemAsync(1002, request, deviceKey: "test-device-key"));

            Assert.Equal(409, ex.StatusCode);
            Assert.Equal("SESSION_NOT_ACTIVE", ex.ErrorCode);
        }
    }
}
