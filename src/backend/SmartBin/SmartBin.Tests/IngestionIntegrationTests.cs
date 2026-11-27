using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SmartBin.Common;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services;
using SmartBin.Services.Bins;
using SmartBin.Services.Sessions;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class IngestionIntegrationTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task IngestItem_ActiveSession_PersistsItemExtendsWindowAndEmitsSignalREvents()
        {
            int sessionId = await CreateSessionAsync(DateTime.UtcNow.AddSeconds(15));
            var initialExpiry = await _factory.ExecuteDbAsync(db =>
                db.DisposalSessions.Where(s => s.SessionId == sessionId).Select(s => s.WindowExpiresAt).FirstAsync());

            var token = _factory.GenerateToken(_factory.Citizen1Id, "USER_CITIZEN");
            await using var hub = _factory.CreateHubConnection(token);

            ItemReceivedEventDto? receivedItemEvent = null;
            SessionWindowUpdatedEventDto? windowEvent = null;
            var eventsSignal = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

            hub.On<ItemReceivedEventDto>("ItemReceived", payload =>
            {
                receivedItemEvent = payload;
                if (windowEvent != null) eventsSignal.TrySetResult(true);
            });
            hub.On<SessionWindowUpdatedEventDto>("SessionWindowUpdated", payload =>
            {
                windowEvent = payload;
                if (receivedItemEvent != null) eventsSignal.TrySetResult(true);
            });

            await hub.StartAsync();
            await hub.InvokeAsync("JoinSession", sessionId);

            using var deviceClient = _factory.CreateClient();
            using var form = CreateImageForm("metal_can.jpg");
            deviceClient.DefaultRequestHeaders.Add("X-Device-Key", "device-secret");

            var response = await deviceClient.PostAsync($"/api/v1/sessions/{sessionId}/items", form);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");
            int itemId = data.GetProperty("itemId").GetInt32();
            var newExpiry = data.GetProperty("windowExpiresAt").GetDateTime().ToUniversalTime();

            Assert.Equal("METAL", data.GetProperty("wasteType").GetString());
            Assert.Equal(20, data.GetProperty("estimatedPoints").GetInt32());
            Assert.True(newExpiry > initialExpiry!.Value.AddSeconds(30));

            var completed = await Task.WhenAny(eventsSignal.Task, Task.Delay(5000));
            Assert.Equal(eventsSignal.Task, completed);

            Assert.NotNull(receivedItemEvent);
            Assert.Equal(itemId, receivedItemEvent!.ItemId);
            Assert.Equal("METAL", receivedItemEvent.WasteType);
            Assert.Equal(20, receivedItemEvent.EstimatedPoints);

            Assert.NotNull(windowEvent);
            Assert.Equal(sessionId, windowEvent!.SessionId);
        }

        [Fact]
        public async Task IngestItem_ExpiredOrTerminatedSession_IsRejectedWith409()
        {
            int expiredSessionId = await CreateSessionAsync(DateTime.UtcNow.AddSeconds(-10));
            int terminatedSessionId = await CreateSessionAsync(DateTime.UtcNow.AddSeconds(60), SessionStatus.Terminated);

            using var deviceClient = _factory.CreateClient();
            deviceClient.DefaultRequestHeaders.Add("X-Device-Key", "device-secret");

            using var form1 = CreateImageForm("plastic_bottle.jpg");
            var expiredResp = await deviceClient.PostAsync($"/api/v1/sessions/{expiredSessionId}/items", form1);
            Assert.Equal(HttpStatusCode.Conflict, expiredResp.StatusCode);

            using var form2 = CreateImageForm("plastic_bottle.jpg");
            var terminatedResp = await deviceClient.PostAsync($"/api/v1/sessions/{terminatedSessionId}/items", form2);
            Assert.Equal(HttpStatusCode.Conflict, terminatedResp.StatusCode);
        }

        [Fact]
        public async Task IngestItem_FailedPersistenceOrStorage_DoesNotSendSignalREvents()
        {
            int sessionId = await CreateSessionAsync(DateTime.UtcNow.AddSeconds(30));
            var token = _factory.GenerateToken(_factory.Citizen1Id, "USER_CITIZEN");
            await using var hub = _factory.CreateHubConnection(token);

            bool anyEventReceived = false;
            hub.On<ItemReceivedEventDto>("ItemReceived", _ => anyEventReceived = true);
            hub.On<SessionWindowUpdatedEventDto>("SessionWindowUpdated", _ => anyEventReceived = true);

            await hub.StartAsync();
            await hub.InvokeAsync("JoinSession", sessionId);

            _factory.FakeStorage.ShouldFail = true;
            try
            {
                using var deviceClient = _factory.CreateClient();
                using var form = CreateImageForm("plastic.jpg");
                await Assert.ThrowsAnyAsync<Exception>(() =>
                    deviceClient.PostAsync($"/api/v1/sessions/{sessionId}/items", form));
            }
            finally
            {
                _factory.FakeStorage.ShouldFail = false;
            }

            await Task.Delay(300);
            Assert.False(anyEventReceived);

            var itemCount = await _factory.ExecuteDbAsync(db =>
                db.DisposalItems.CountAsync(di => di.SessionId == sessionId));
            Assert.Equal(0, itemCount);
        }

        [Fact]
        public async Task IngestItem_ConcurrentSubmissions_BothPersistAndExpiryRemainsValidFuture()
        {
            int sessionId = await CreateSessionAsync(DateTime.UtcNow.AddSeconds(20));

            async Task<HttpResponseMessage> PostItemAsync(string fileName)
            {
                using var client = _factory.CreateClient();
                client.DefaultRequestHeaders.Add("X-Device-Key", "device-secret");
                using var form = CreateImageForm(fileName);
                return await client.PostAsync($"/api/v1/sessions/{sessionId}/items", form);
            }

            var responses = await Task.WhenAll(
                PostItemAsync("plastic_1.jpg"),
                PostItemAsync("paper_2.jpg"));

            Assert.All(responses, r => Assert.Equal(HttpStatusCode.Created, r.StatusCode));

            var items = await _factory.ExecuteDbAsync(db =>
                db.DisposalItems.AsNoTracking().Where(i => i.SessionId == sessionId).ToListAsync());
            Assert.Equal(2, items.Count);

            var session = await _factory.ExecuteDbAsync(db =>
                db.DisposalSessions.AsNoTracking().FirstAsync(s => s.SessionId == sessionId));
            Assert.True(session.WindowExpiresAt > DateTime.UtcNow.AddSeconds(45));
        }

        [Fact]
        public async Task IngestItemByBin_ResolvesLockedUserWithoutSessionId_ReturnsAngleAndRejectsAfterEnd()
        {
            using var userClient = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var startResp = await userClient.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinQr}/sessions",
                new { qrPayload = _factory.AvailableBinQr });
            Assert.Equal(HttpStatusCode.Created, startResp.StatusCode);

            using var startDoc = JsonDocument.Parse(await startResp.Content.ReadAsStringAsync());
            int sessionId = startDoc.RootElement.GetProperty("data").GetProperty("sessionId").GetInt32();

            using var deviceClient = _factory.CreateClient();
            deviceClient.DefaultRequestHeaders.Add("X-Device-Key", "device-secret");
            using var form = CreateImageForm("metal_can.jpg");

            var ingestResp = await deviceClient.PostAsync($"/api/v1/bins/{_factory.AvailableBinQr}/items", form);
            Assert.Equal(HttpStatusCode.Created, ingestResp.StatusCode);

            using var ingestDoc = JsonDocument.Parse(await ingestResp.Content.ReadAsStringAsync());
            var data = ingestDoc.RootElement.GetProperty("data");
            Assert.Equal(sessionId, data.GetProperty("sessionId").GetInt32());
            Assert.Equal(_factory.AvailableBinId, data.GetProperty("binId").GetInt32());
            Assert.Equal(_factory.Citizen1Id, data.GetProperty("userId").GetInt32());
            Assert.Equal("METAL", data.GetProperty("wasteType").GetString());
            Assert.Equal("metal", data.GetProperty("predictedLabel").GetString());
            Assert.Equal(72, data.GetProperty("angle").GetInt32());

            // End session -> bin lock releases and further hardware uploads fail with 409 NO_ACTIVE_SESSION
            var endResp = await userClient.PostAsync($"/api/v1/sessions/{sessionId}/end", null);
            Assert.Equal(HttpStatusCode.OK, endResp.StatusCode);

            using var formAfter = CreateImageForm("plastic.jpg");
            var rejectedResp = await deviceClient.PostAsync($"/api/v1/bins/{_factory.AvailableBinQr}/items", formAfter);
            Assert.Equal(HttpStatusCode.Conflict, rejectedResp.StatusCode);
            using var errDoc = JsonDocument.Parse(await rejectedResp.Content.ReadAsStringAsync());
            Assert.Equal("NO_ACTIVE_SESSION", errDoc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task MlNetClassificationAdapter_LoadsTrainedModelAndClassifiesValidJpeg()
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["MLModel:ModelPath"] = Path.Combine(AppContext.BaseDirectory, "AI", "MLModel.mlnet")
                })
                .Build();

            var adapter = new MlNetClassificationAdapter(config, NullLogger<MlNetClassificationAdapter>.Instance);

            using var img = new Image<Rgb24>(64, 64, new Rgb24(220, 220, 220));
            using var jpegStream = new MemoryStream();
            await img.SaveAsJpegAsync(jpegStream);
            jpegStream.Position = 0;

            var formFile = new FormFile(jpegStream, 0, jpegStream.Length, "image", "sample.jpg")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/jpeg"
            };

            var result = await adapter.ClassifyImageAsync(formFile, jpegStream);

            Assert.Contains(result.WasteType, WasteTypeNames.All);
            Assert.Contains(result.PredictedLabel, new[] { "biological", "metal", "paper", "plastic", "trash" });
            Assert.Contains(result.Angle, new[] { 0, 72, 144, 216, 288 });
            Assert.True(result.ConfidenceScore > 0m && result.ConfidenceScore <= 1m);

            using var invalidStream = new MemoryStream(new byte[] { 1, 2, 3, 4 });
            var invalidFile = new FormFile(invalidStream, 0, invalidStream.Length, "image", "bad.jpg")
            {
                Headers = new HeaderDictionary(),
                ContentType = "image/jpeg"
            };

            var ex = await Assert.ThrowsAsync<ApiException>(() => adapter.ClassifyImageAsync(invalidFile, invalidStream));
            Assert.Equal(400, ex.StatusCode);
        }

        private async Task<int> CreateSessionAsync(DateTime windowExpiresAt, string status = SessionStatus.Active)
        {
            return await _factory.ExecuteDbAsync(async db =>
            {
                var session = new DisposalSession
                {
                    UserId = _factory.Citizen1Id,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow.AddSeconds(-10),
                    Status = status,
                    WindowExpiresAt = windowExpiresAt,
                    PointsStatus = PointsStatus.Pending
                };
                db.DisposalSessions.Add(session);
                await db.SaveChangesAsync();
                return session.SessionId;
            });
        }

        private static MultipartFormDataContent CreateImageForm(string fileName)
        {
            var form = new MultipartFormDataContent();
            var bytes = new ByteArrayContent(new byte[] { 1, 2, 3, 4 });
            bytes.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            form.Add(bytes, "image", fileName);
            form.Add(new StringContent(DateTime.UtcNow.ToString("O")), "capturedAt");
            return form;
        }
    }
}
