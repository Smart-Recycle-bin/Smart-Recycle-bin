using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services;
using SmartBin.Services.Surveys;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class SurveyTests : IAsyncLifetime
    {
        private readonly SmartBinTestFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task GetSessionSurvey_ActiveSessionReturns409_WaitingReturnsItems_NonOwnerForbidden()
        {
            int activeSessionId = await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Active, createSurvey: false);
            int endedSessionId = await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Terminated, createSurvey: true);

            using var ownerClient = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            using var otherClient = _factory.CreateAuthorizedClient(_factory.Citizen2Id);

            var activeResp = await ownerClient.GetAsync($"/api/v1/sessions/{activeSessionId}/survey");
            Assert.Equal(HttpStatusCode.Conflict, activeResp.StatusCode);
            using var activeDoc = JsonDocument.Parse(await activeResp.Content.ReadAsStringAsync());
            Assert.Equal("SESSION_ACTIVE", activeDoc.RootElement.GetProperty("error").GetProperty("code").GetString());

            var forbiddenResp = await otherClient.GetAsync($"/api/v1/sessions/{endedSessionId}/survey");
            Assert.Equal(HttpStatusCode.Forbidden, forbiddenResp.StatusCode);

            var missingResp = await ownerClient.GetAsync("/api/v1/sessions/999999/survey");
            Assert.Equal(HttpStatusCode.NotFound, missingResp.StatusCode);

            var okResp = await ownerClient.GetAsync($"/api/v1/sessions/{endedSessionId}/survey");
            Assert.Equal(HttpStatusCode.OK, okResp.StatusCode);

            using var okDoc = JsonDocument.Parse(await okResp.Content.ReadAsStringAsync());
            var data = okDoc.RootElement.GetProperty("data");
            Assert.Equal("waiting", data.GetProperty("status").GetString());
            Assert.Equal(35, data.GetProperty("totalPoints").GetInt32());
            Assert.Equal(2, data.GetProperty("items").GetArrayLength());
        }

        [Fact]
        public async Task ConfirmSurvey_AwardsPointsOnce_AndConcurrentRequestsCannotDoubleAward()
        {
            int sessionId = await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Terminated, createSurvey: true);

            using var clientA = _factory.CreateAuthorizedClient(_factory.Citizen1Id);
            using var clientB = _factory.CreateAuthorizedClient(_factory.Citizen1Id);

            var responses = await Task.WhenAll(
                clientA.PostAsync($"/api/v1/sessions/{sessionId}/survey/confirm", null),
                clientB.PostAsync($"/api/v1/sessions/{sessionId}/survey/confirm", null));

            var okResponses = responses.Where(r => r.StatusCode == HttpStatusCode.OK).ToList();
            var conflictResponses = responses.Where(r => r.StatusCode == HttpStatusCode.Conflict).ToList();

            Assert.Single(okResponses);
            Assert.Single(conflictResponses);

            using var okDoc = JsonDocument.Parse(await okResponses[0].Content.ReadAsStringAsync());
            var data = okDoc.RootElement.GetProperty("data");
            Assert.Equal("done", data.GetProperty("surveyStatus").GetString());
            Assert.Equal("confirmed", data.GetProperty("outcome").GetString());
            Assert.Equal("awarded", data.GetProperty("pointsStatus").GetString());
            Assert.Equal(35, data.GetProperty("pointsAwarded").GetInt32());
            Assert.Equal(35, data.GetProperty("newAvailablePoints").GetInt32());
            Assert.Equal(35, data.GetProperty("newLifetimePoints").GetInt32());

            var ledgerEntries = await _factory.ExecuteDbAsync(db =>
                db.LedgerTransactions.AsNoTracking().Where(lt => lt.SessionId == sessionId).ToListAsync());
            Assert.Single(ledgerEntries);
            Assert.Equal(35, ledgerEntries[0].PointsDelta);

            // Getting already resolved survey returns 409 SURVEY_ALREADY_RESOLVED
            var getResolvedResp = await clientA.GetAsync($"/api/v1/sessions/{sessionId}/survey");
            Assert.Equal(HttpStatusCode.Conflict, getResolvedResp.StatusCode);
            using var resolvedDoc = JsonDocument.Parse(await getResolvedResp.Content.ReadAsStringAsync());
            Assert.Equal("SURVEY_ALREADY_RESOLVED", resolvedDoc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task GetMySurveys_FiltersPaginationAndPendingPointsWork()
        {
            // Session 1: waiting survey (35 pts pending)
            await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Terminated, createSurvey: true);
            // Session 2: done survey with correction_submitted and pending points (35 pts pending)
            int s2 = await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Terminated, createSurvey: true);
            await _factory.ExecuteDbAsync(async db =>
            {
                var survey = await db.DisposalSurveys.FirstAsync(s => s.SessionId == s2);
                survey.Status = SurveyStatus.Done;
                survey.Outcome = SurveyOutcome.CorrectionSubmitted;
                survey.SubmittedAt = DateTime.UtcNow;
                await db.SaveChangesAsync();
            });
            // Session 3: other user's waiting survey (must NOT appear)
            await CreateSessionWithItemsAsync(_factory.Citizen2Id, SessionStatus.Terminated, createSurvey: true);

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);

            var allResp = await client.GetAsync("/api/v1/surveys?status=all&page=1&pageSize=1");
            Assert.Equal(HttpStatusCode.OK, allResp.StatusCode);
            using var allDoc = JsonDocument.Parse(await allResp.Content.ReadAsStringAsync());
            Assert.Equal(1, allDoc.RootElement.GetProperty("data").GetProperty("surveys").GetArrayLength());
            var meta = allDoc.RootElement.GetProperty("meta");
            Assert.Equal(2, meta.GetProperty("totalItems").GetInt32());
            Assert.Equal(2, meta.GetProperty("totalPages").GetInt32());
            Assert.Equal(70, meta.GetProperty("pendingPoints").GetInt32());

            var doneResp = await client.GetAsync("/api/v1/surveys?status=done");
            Assert.Equal(HttpStatusCode.OK, doneResp.StatusCode);
            using var doneDoc = JsonDocument.Parse(await doneResp.Content.ReadAsStringAsync());
            var doneItem = doneDoc.RootElement.GetProperty("data").GetProperty("surveys")[0];
            Assert.Equal("done", doneItem.GetProperty("status").GetString());
            Assert.Equal("correction_submitted", doneItem.GetProperty("outcome").GetString());
            Assert.Equal("pending", doneItem.GetProperty("pointsStatus").GetString());

            var invalidResp = await client.GetAsync("/api/v1/surveys?status=invalid");
            Assert.Equal(HttpStatusCode.BadRequest, invalidResp.StatusCode);
            using var invalidDoc = JsonDocument.Parse(await invalidResp.Content.ReadAsStringAsync());
            Assert.Equal("VALIDATION_ERROR", invalidDoc.RootElement.GetProperty("error").GetProperty("code").GetString());
        }

        [Fact]
        public async Task SubmitCorrections_Validations_Member5Integration_AndRollbackWork()
        {
            int session1 = await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Terminated, createSurvey: true);
            int otherSession = await CreateSessionWithItemsAsync(_factory.Citizen2Id, SessionStatus.Terminated, createSurvey: true);

            var surveyId = await _factory.ExecuteDbAsync(db =>
                db.DisposalSurveys.Where(s => s.SessionId == session1).Select(s => s.SurveyId).FirstAsync());
            var session1Items = await _factory.ExecuteDbAsync(db =>
                db.DisposalItems.Where(i => i.SessionId == session1).OrderBy(i => i.ItemId).ToListAsync());
            var otherItemId = await _factory.ExecuteDbAsync(db =>
                db.DisposalItems.Where(i => i.SessionId == otherSession).Select(i => i.ItemId).FirstAsync());

            using var client = _factory.CreateAuthorizedClient(_factory.Citizen1Id);

            // 1. Invalid aiRating
            var badRatingResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 6,
                items = new[] { new { itemId = session1Items[0].ItemId, confirmedWasteType = "ORGANIC" } }
            });
            Assert.Equal(HttpStatusCode.BadRequest, badRatingResp.StatusCode);

            // 2. Duplicate itemId
            var dupResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 4,
                items = new[]
                {
                    new { itemId = session1Items[0].ItemId, confirmedWasteType = "ORGANIC" },
                    new { itemId = session1Items[0].ItemId, confirmedWasteType = "ORGANIC" }
                }
            });
            Assert.Equal(HttpStatusCode.BadRequest, dupResp.StatusCode);

            // 3. Item from another session
            var foreignResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 4,
                items = new[] { new { itemId = otherItemId, confirmedWasteType = "ORGANIC" } }
            });
            Assert.Equal(HttpStatusCode.BadRequest, foreignResp.StatusCode);

            // 4. Unknown WasteType
            var unknownWtResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 4,
                items = new[] { new { itemId = session1Items[0].ItemId, confirmedWasteType = "URANIUM" } }
            });
            Assert.Equal(HttpStatusCode.BadRequest, unknownWtResp.StatusCode);

            // 5. Zero conflicts rejected with instruction to use E23
            var zeroConflictResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 5,
                items = new[] { new { itemId = session1Items[0].ItemId, confirmedWasteType = "PLASTIC" } }
            });
            Assert.Equal(HttpStatusCode.BadRequest, zeroConflictResp.StatusCode);

            // 6. Member 5 unavailable -> 503 and transaction rolls back completely
            _factory.Member5Inspection.CreateHandler = null;
            var unavailableResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 3,
                items = new[] { new { itemId = session1Items[1].ItemId, confirmedWasteType = "PAPER" } }
            });
            Assert.Equal(HttpStatusCode.ServiceUnavailable, unavailableResp.StatusCode);

            var stillWaiting = await _factory.ExecuteDbAsync(db =>
                db.DisposalSurveys.AsNoTracking().FirstAsync(s => s.SurveyId == surveyId));
            Assert.Equal(SurveyStatus.Waiting, stillWaiting.Status);
            Assert.Equal(0, await _factory.ExecuteDbAsync(db => db.SurveyResponses.CountAsync(r => r.SurveyId == surveyId)));

            // 7. Valid subset with 1 matching item + 1 conflicting item -> only 1 disputed report created
            _factory.Member5Inspection.CreateHandler = (req, _) => Task.FromResult(new List<int> { 701 });

            var okResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 4,
                items = new[]
                {
                    new { itemId = session1Items[0].ItemId, confirmedWasteType = "PLASTIC" },
                    new { itemId = session1Items[1].ItemId, confirmedWasteType = "PAPER" }
                }
            });

            Assert.Equal(HttpStatusCode.OK, okResp.StatusCode);
            Assert.NotNull(_factory.Member5Inspection.LastCreateRequest);
            Assert.Single(_factory.Member5Inspection.LastCreateRequest!.DisputedItems);
            Assert.Equal(session1Items[1].ItemId, _factory.Member5Inspection.LastCreateRequest.DisputedItems[0].ItemId);

            using var okDoc = JsonDocument.Parse(await okResp.Content.ReadAsStringAsync());
            var data = okDoc.RootElement.GetProperty("data");
            Assert.Equal("done", data.GetProperty("surveyStatus").GetString());
            Assert.Equal("correction_submitted", data.GetProperty("outcome").GetString());
            Assert.Equal("pending", data.GetProperty("pointsStatus").GetString());
            Assert.Equal(701, data.GetProperty("flaggedReportIds")[0].GetInt32());

            // Wallet still zero
            var wallet = await _factory.ExecuteDbAsync(db =>
                db.Wallets.AsNoTracking().FirstAsync(w => w.UserId == _factory.Citizen1Id));
            Assert.Equal(0, wallet.AvailablePoints);

            // 8. Duplicate submission rejected
            var duplicateSubmitResp = await client.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 4,
                items = new[] { new { itemId = session1Items[1].ItemId, confirmedWasteType = "PAPER" } }
            });
            Assert.Equal(HttpStatusCode.Conflict, duplicateSubmitResp.StatusCode);
        }

        [Fact]
        public async Task FinalizeSessionPoints_WaitsForAllReports_ThenAwardsWholeSessionOnce()
        {
            int sessionId = await CreateSessionWithItemsAsync(_factory.Citizen1Id, SessionStatus.Terminated, createSurvey: true);
            var items = await _factory.ExecuteDbAsync(db =>
                db.DisposalItems.Where(i => i.SessionId == sessionId).OrderBy(i => i.ItemId).ToListAsync());
            // Item 0: PLASTIC (15), Item 1: METAL (20)

            // Unresolved report -> must do nothing
            _factory.Member5Inspection.GetReportsHandler = (_, _) => Task.FromResult(new List<SessionInspectionReportStatusDto>
            {
                new() { ReportId = 1, ItemId = items[1].ItemId, IsResolved = false }
            });

            using (var scope = _factory.Services.CreateScope())
            {
                var surveyService = scope.ServiceProvider.GetRequiredService<ISurveyService>();
                await surveyService.FinalizeSessionPointsAsync(sessionId);
            }

            var walletBefore = await _factory.ExecuteDbAsync(db =>
                db.Wallets.AsNoTracking().FirstAsync(w => w.UserId == _factory.Citizen1Id));
            Assert.Equal(0, walletBefore.AvailablePoints);

            // Resolved: Item 1 accepted as PAPER (10 pts); Item 0 undisputed PLASTIC (15 pts) -> total = 25
            _factory.Member5Inspection.GetReportsHandler = (_, _) => Task.FromResult(new List<SessionInspectionReportStatusDto>
            {
                new() { ReportId = 1, ItemId = items[1].ItemId, IsResolved = true, IsAccepted = true, AdminConfirmedWasteTypeId = 3 }
            });

            await Task.WhenAll(
                Task.Run(async () =>
                {
                    using var scope = _factory.Services.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<ISurveyService>().FinalizeSessionPointsAsync(sessionId);
                }),
                Task.Run(async () =>
                {
                    using var scope = _factory.Services.CreateScope();
                    await scope.ServiceProvider.GetRequiredService<ISurveyService>().FinalizeSessionPointsAsync(sessionId);
                }));

            var sessionAfter = await _factory.ExecuteDbAsync(db =>
                db.DisposalSessions.AsNoTracking().FirstAsync(s => s.SessionId == sessionId));
            Assert.Equal(PointsStatus.Awarded, sessionAfter.PointsStatus);
            Assert.Equal(25, sessionAfter.TotalPoints);

            var walletAfter = await _factory.ExecuteDbAsync(db =>
                db.Wallets.AsNoTracking().FirstAsync(w => w.UserId == _factory.Citizen1Id));
            Assert.Equal(25, walletAfter.AvailablePoints);
            Assert.Equal(25, walletAfter.LifetimeEarnedPoints);

            var ledgerCount = await _factory.ExecuteDbAsync(db =>
                db.LedgerTransactions.CountAsync(lt => lt.SessionId == sessionId));
            Assert.Equal(1, ledgerCount);
        }

        private async Task<int> CreateSessionWithItemsAsync(int userId, string status, bool createSurvey)
        {
            return await _factory.ExecuteDbAsync(async db =>
            {
                var session = new DisposalSession
                {
                    UserId = userId,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow.AddMinutes(-1),
                    EndTime = status == SessionStatus.Active ? null : DateTime.UtcNow,
                    Status = status,
                    WindowExpiresAt = DateTime.UtcNow.AddSeconds(30),
                    PointsStatus = PointsStatus.Pending
                };
                db.DisposalSessions.Add(session);
                await db.SaveChangesAsync();

                db.DisposalItems.AddRange(
                    new DisposalItem
                    {
                        SessionId = session.SessionId,
                        WasteTypeId = 1, // PLASTIC = 15
                        EstimatedPoints = 15,
                        Image = "https://cdn.test/plastic.jpg",
                        DetectedAt = DateTime.UtcNow
                    },
                    new DisposalItem
                    {
                        SessionId = session.SessionId,
                        WasteTypeId = 2, // METAL = 20
                        EstimatedPoints = 20,
                        Image = "https://cdn.test/metal.jpg",
                        DetectedAt = DateTime.UtcNow
                    });

                if (createSurvey)
                {
                    db.DisposalSurveys.Add(new DisposalSurvey
                    {
                        SessionId = session.SessionId,
                        TotalCalculatedPoints = 35,
                        CreatedAt = DateTime.UtcNow,
                        Status = SurveyStatus.Waiting
                    });
                }

                await db.SaveChangesAsync();
                return session.SessionId;
            });
        }
    }
}
