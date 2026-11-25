using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services.Sessions;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class SignalRTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task JoinSession_OwnerSucceeds_AndReceivesSessionEndedAndSurveyReady()
        {
            int sessionId = await CreateActiveSessionAsync(_factory.Citizen1Id);
            var token = _factory.GenerateToken(_factory.Citizen1Id, "USER_CITIZEN");
            await using var hub = _factory.CreateHubConnection(token);

            SessionEndedEventDto? endedEvent = null;
            SurveyReadyEventDto? surveyEvent = null;
            var done = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);

            hub.On<SessionEndedEventDto>("SessionEnded", payload =>
            {
                endedEvent = payload;
                if (surveyEvent != null) done.TrySetResult(true);
            });
            hub.On<SurveyReadyEventDto>("SurveyReady", payload =>
            {
                surveyEvent = payload;
                if (endedEvent != null) done.TrySetResult(true);
            });

            await hub.StartAsync();
            await hub.InvokeAsync("JoinSession", sessionId);

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            var endResp = await client.PostAsync($"/api/v1/sessions/{sessionId}/end", null);
            Assert.Equal(HttpStatusCode.OK, endResp.StatusCode);

            var completed = await Task.WhenAny(done.Task, Task.Delay(5000));
            Assert.Equal(done.Task, completed);

            Assert.NotNull(endedEvent);
            Assert.Equal(sessionId, endedEvent!.SessionId);
            Assert.Equal("terminated", endedEvent.Status);
            Assert.Equal("manual", endedEvent.TerminationReason);

            Assert.NotNull(surveyEvent);
            Assert.Equal(sessionId, surveyEvent!.SessionId);
            Assert.True(surveyEvent.SurveyId > 0);
        }

        [Fact]
        public async Task JoinSession_NonOwnerAndInvalidSession_AreRejected()
        {
            int sessionId = await CreateActiveSessionAsync(_factory.Citizen1Id);
            var otherToken = _factory.GenerateToken(_factory.Citizen2Id, "USER_CITIZEN");
            await using var hub = _factory.CreateHubConnection(otherToken);

            await hub.StartAsync();

            var forbiddenEx = await Assert.ThrowsAsync<HubException>(() => hub.InvokeAsync("JoinSession", sessionId));
            Assert.Contains("FORBIDDEN", forbiddenEx.Message);

            var missingEx = await Assert.ThrowsAsync<HubException>(() => hub.InvokeAsync("JoinSession", 999999));
            Assert.Contains("NOT_FOUND", missingEx.Message);
        }

        [Fact]
        public async Task HubConnection_UnauthenticatedOrWrongRole_IsRejected()
        {
            await using var unauthHub = _factory.CreateHubConnection(null);
            await Assert.ThrowsAnyAsync<Exception>(() => unauthHub.StartAsync());

            var collectorToken = _factory.GenerateToken(_factory.CollectorId, "OPS_COLLECTOR");
            await using var collectorHub = _factory.CreateHubConnection(collectorToken);
            int sessionId = await CreateActiveSessionAsync(_factory.Citizen1Id);

            // Either StartAsync fails with 403 or hub method invocation fails with HubException depending on transport negotiation
            bool rejected = false;
            try
            {
                await collectorHub.StartAsync();
                await collectorHub.InvokeAsync("JoinSession", sessionId);
            }
            catch
            {
                rejected = true;
            }

            Assert.True(rejected);
        }

        [Fact]
        public async Task QueryStringAccessToken_WorksForHub_AndIsNotAcceptedOnRestEndpoints()
        {
            int sessionId = await CreateActiveSessionAsync(_factory.Citizen1Id);
            var token = _factory.GenerateToken(_factory.Citizen1Id, "USER_CITIZEN");

            // Accepted on /hubs/sessions via query string
            var hubUrl = new Uri(_factory.Server.BaseAddress, $"/hubs/sessions?access_token={Uri.EscapeDataString(token)}");
            await using var hub = new HubConnectionBuilder()
                .WithUrl(hubUrl, options =>
                {
                    options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                })
                .Build();

            await hub.StartAsync();
            await hub.InvokeAsync("JoinSession", sessionId);

            // Rejected on normal REST endpoints without Authorization header
            using var client = _factory.CreateClient();
            var response = await client.GetAsync($"/api/v1/wallet/balance?access_token={Uri.EscapeDataString(token)}");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        private async Task<int> CreateActiveSessionAsync(int userId)
        {
            return await _factory.ExecuteDbAsync(async db =>
            {
                var session = new DisposalSession
                {
                    UserId = userId,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow,
                    Status = SessionStatus.Active,
                    WindowExpiresAt = DateTime.UtcNow.AddSeconds(60),
                    PointsStatus = PointsStatus.Pending
                };
                db.DisposalSessions.Add(session);
                await db.SaveChangesAsync();
                return session.SessionId;
            });
        }
    }
}
