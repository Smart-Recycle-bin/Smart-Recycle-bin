using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartBin.DTOs.Sessions;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services.Sessions;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class SessionTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task StartSession_ValidQr_CreatesActiveSessionWith60SecondWindow()
        {
            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var before = DateTime.UtcNow;

            var response = await client.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinId}/sessions",
                new { qrPayload = _factory.AvailableBinQr });

            var after = DateTime.UtcNow;
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            var root = doc.RootElement;
            Assert.True(root.GetProperty("success").GetBoolean());

            var data = root.GetProperty("data");
            var sessionId = data.GetProperty("sessionId").GetInt32();
            Assert.True(sessionId > 0);
            Assert.Equal(_factory.AvailableBinId, data.GetProperty("binId").GetInt32());
            Assert.Equal("active", data.GetProperty("status").GetString());

            var expiresAt = data.GetProperty("windowExpiresAt").GetDateTime().ToUniversalTime();
            Assert.InRange(expiresAt, before.AddSeconds(58), after.AddSeconds(62));

            var persisted = await _factory.ExecuteDbAsync(db =>
                db.DisposalSessions.AsNoTracking().FirstOrDefaultAsync(s => s.SessionId == sessionId));

            Assert.NotNull(persisted);
            Assert.Equal(_factory.Citizen1Id, persisted!.UserId);
            Assert.Equal(PointsStatus.Pending, persisted.PointsStatus);
            Assert.Equal(0, persisted.TotalPoints);
        }

        [Fact]
        public async Task StartSession_Full80Bin_IsServiceableAndSucceeds()
        {
            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var response = await client.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.Full80BinId}/sessions",
                new { qrPayload = _factory.Full80BinQr });

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task StartSession_InvalidBinId_Returns400ValidationError()
        {
            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var response = await client.PostAsJsonAsync(
                "/api/v1/bins/0/sessions",
                new { qrPayload = _factory.AvailableBinQr });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("VALIDATION_ERROR", doc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task StartSession_NonexistentBin_Returns404BinNotFound()
        {
            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var response = await client.PostAsJsonAsync(
                "/api/v1/bins/99999/sessions",
                new { qrPayload = "QR-BIN-NONE" });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("BIN_NOT_FOUND", doc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task StartSession_InvalidQrPayload_Returns400ValidationError()
        {
            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var response = await client.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinId}/sessions",
                new { qrPayload = "WRONG-QR-CODE" });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("VALIDATION_ERROR", doc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Theory]
        [InlineData("needs_service")]
        [InlineData("offline")]
        public async Task StartSession_UnserviceableBin_Returns409BinUnserviceable(string binCase)
        {
            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            int binId = binCase == "offline" ? _factory.OfflineBinId : _factory.NeedsServiceBinId;
            string qr = binCase == "offline" ? _factory.OfflineBinQr : _factory.NeedsServiceBinQr;

            var response = await client.PostAsJsonAsync(
                $"/api/v1/bins/{binId}/sessions",
                new { qrPayload = qr });

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("BIN_UNSERVICEABLE", doc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task StartSession_SuspendedUser_Returns403AccountSuspended()
        {
            using var client = _factory.CreateAuthorizedClient(_factory.SuspendedCitizenId);
            var response = await client.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinId}/sessions",
                new { qrPayload = _factory.AvailableBinQr });

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            Assert.Equal("ACCOUNT_SUSPENDED", doc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task StartSession_WhenBinAlreadyLockedByActiveSession_Returns409AndUnlocksAfterEnd()
        {
            using var client1 = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            using var client2 = _factory.CreateAuthorizedClient(_factory.Citizen2Id);

            // Citizen 1 scans by QRCode string and locks the bin exclusively.
            var resp1 = await client1.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinQr}/sessions",
                new { qrPayload = _factory.AvailableBinQr });
            Assert.Equal(HttpStatusCode.Created, resp1.StatusCode);

            using var doc1 = JsonDocument.Parse(await resp1.Content.ReadAsStringAsync());
            int s1 = doc1.RootElement.GetProperty("data").GetProperty("sessionId").GetInt32();

            // Citizen 2 tries to scan the same locked bin -> rejected with 409 BIN_IN_USE.
            var resp2Locked = await client2.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinId}/sessions",
                new { qrPayload = _factory.AvailableBinQr });
            Assert.Equal(HttpStatusCode.Conflict, resp2Locked.StatusCode);
            using var docLocked = JsonDocument.Parse(await resp2Locked.Content.ReadAsStringAsync());
            Assert.Equal("BIN_IN_USE", docLocked.RootElement.GetProperty("error").GetProperty("code").GetString());

            // Citizen 1 finishes session -> lock is released and SurveyId is returned.
            var endResp = await client1.PostAsync($"/api/v1/sessions/{s1}/end", null);
            Assert.Equal(HttpStatusCode.OK, endResp.StatusCode);
            using var endDoc = JsonDocument.Parse(await endResp.Content.ReadAsStringAsync());
            Assert.True(endDoc.RootElement.GetProperty("data").GetProperty("surveyId").GetInt32() > 0);

            // Citizen 2 can now scan and lock the bin cleanly.
            var resp2Unlocked = await client2.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinId}/sessions",
                new { qrPayload = _factory.AvailableBinQr });
            Assert.Equal(HttpStatusCode.Created, resp2Unlocked.StatusCode);
        }

        [Fact]
        public async Task GetSessionStatus_OwnerReceivesItems_NonOwnerForbidden_MissingReturns404()
        {
            int sessionId = await _factory.ExecuteDbAsync(async db =>
            {
                var s = new DisposalSession
                {
                    UserId = _factory.Citizen1Id,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow,
                    Status = SessionStatus.Active,
                    WindowExpiresAt = DateTime.UtcNow.AddSeconds(60),
                    PointsStatus = PointsStatus.Pending
                };
                db.DisposalSessions.Add(s);
                await db.SaveChangesAsync();

                db.DisposalItems.Add(new DisposalItem
                {
                    SessionId = s.SessionId,
                    WasteTypeId = 1,
                    EstimatedPoints = 15,
                    Image = "https://cdn.test/1.jpg",
                    DetectedAt = DateTime.UtcNow
                });
                await db.SaveChangesAsync();
                return s.SessionId;
            });

            using var ownerClient = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            using var otherClient = _factory.CreateAuthorizedClient(_factory.Citizen2Id);

            var ownerResp = await ownerClient.GetAsync($"/api/v1/sessions/{sessionId}");
            Assert.Equal(HttpStatusCode.OK, ownerResp.StatusCode);

            using var doc = JsonDocument.Parse(await ownerResp.Content.ReadAsStringAsync());
            var data = doc.RootElement.GetProperty("data");
            Assert.Equal(sessionId, data.GetProperty("sessionId").GetInt32());
            var items = data.GetProperty("items");
            Assert.Equal(1, items.GetArrayLength());
            Assert.Equal("PLASTIC", items[0].GetProperty("wasteType").GetString());
            Assert.Equal(15, items[0].GetProperty("estimatedPoints").GetInt32());

            var otherResp = await otherClient.GetAsync($"/api/v1/sessions/{sessionId}");
            Assert.Equal(HttpStatusCode.Forbidden, otherResp.StatusCode);

            var missingResp = await ownerClient.GetAsync("/api/v1/sessions/999999");
            Assert.Equal(HttpStatusCode.NotFound, missingResp.StatusCode);
        }

        [Fact]
        public async Task EndSession_OwnerEndsActive_CreatesSingleSurvey_RejectsRepeatAndNonOwner()
        {
            using var ownerClient = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            using var otherClient = _factory.CreateAuthorizedClient(_factory.Citizen2Id);

            var createResp = await ownerClient.PostAsJsonAsync(
                $"/api/v1/bins/{_factory.AvailableBinId}/sessions",
                new { qrPayload = _factory.AvailableBinQr });
            using var createDoc = JsonDocument.Parse(await createResp.Content.ReadAsStringAsync());
            int sessionId = createDoc.RootElement.GetProperty("data").GetProperty("sessionId").GetInt32();

            var forbiddenResp = await otherClient.PostAsync($"/api/v1/sessions/{sessionId}/end", null);
            Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);

            var endResp = await ownerClient.PostAsync($"/api/v1/sessions/{sessionId}/end", null);
            Assert.Equal(HttpStatusCode.OK, endResp.StatusCode);
            using var endDoc = JsonDocument.Parse(await endResp.Content.ReadAsStringAsync());
            var endData = endDoc.RootElement.GetProperty("data");
            Assert.Equal("terminated", endData.GetProperty("status").GetString());
            Assert.Equal("manual", endData.GetProperty("terminationReason").GetString());

            var repeatResp = await ownerClient.PostAsync($"/api/v1/sessions/{sessionId}/end", null);
            Assert.Equal(HttpStatusCode.Conflict, repeatResp.StatusCode);
            using var repeatDoc = JsonDocument.Parse(await repeatResp.Content.ReadAsStringAsync());
            Assert.Equal("SESSION_NOT_ACTIVE", repeatDoc.RootElement.GetProperty("error").GetProperty("code").GetString());

            var session = await _factory.ExecuteDbAsync(db =>
                db.DisposalSessions.AsNoTracking().FirstAsync(s => s.SessionId == sessionId));
            Assert.NotNull(session.EndTime);
            Assert.Equal(SessionStatus.Terminated, session.Status);

            var surveyCount = await _factory.ExecuteDbAsync(db =>
                db.DisposalSurveys.CountAsync(s => s.SessionId == sessionId));
            Assert.Equal(1, surveyCount);
        }

        [Fact]
        public async Task ProcessExpiredSessions_TerminatesOnceAndCreatesOneSurvey()
        {
            int expiredSessionId = await _factory.ExecuteDbAsync(async db =>
            {
                var s = new DisposalSession
                {
                    UserId = _factory.Citizen1Id,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow.AddMinutes(-2),
                    Status = SessionStatus.Active,
                    WindowExpiresAt = DateTime.UtcNow.AddSeconds(-5),
                    PointsStatus = PointsStatus.Pending
                };
                db.DisposalSessions.Add(s);
                await db.SaveChangesAsync();
                return s.SessionId;
            });

            using var scope = _factory.Services.CreateScope();
            var sessionService = scope.ServiceProvider.GetRequiredService<ISessionService>();

            int firstRun = await sessionService.ProcessExpiredSessionsAsync();
            int secondRun = await sessionService.ProcessExpiredSessionsAsync();

            Assert.Equal(1, firstRun);
            Assert.Equal(0, secondRun);

            var session = await _factory.ExecuteDbAsync(db =>
                db.DisposalSessions.AsNoTracking().FirstAsync(s => s.SessionId == expiredSessionId));
            Assert.Equal(SessionStatus.Terminated, session.Status);
            Assert.NotNull(session.EndTime);

            var surveys = await _factory.ExecuteDbAsync(db =>
                db.DisposalSurveys.Where(s => s.SessionId == expiredSessionId).ToListAsync());
            Assert.Single(surveys);
            Assert.Equal(SurveyStatus.Waiting, surveys[0].Status);
        }
    }
}
