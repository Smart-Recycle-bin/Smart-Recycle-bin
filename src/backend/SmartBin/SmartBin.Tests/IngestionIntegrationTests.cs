using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using SmartBin.Models;
using SmartBin.Models.Constants;
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
