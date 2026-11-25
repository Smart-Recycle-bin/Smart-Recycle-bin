using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Services.Inspections;
using SmartBin.Services.Surveys;
using SmartBin.Tests.Infrastructure;

namespace SmartBin.Tests
{
    public class RealInspectionWebApplicationFactory : SmartBinTestFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IMember5InspectionService>();
                services.AddScoped<IMember5InspectionService, Member5InspectionService>();
            });
        }
    }

    public class AdminInspectionsTests : IAsyncLifetime
    {
        private readonly RealInspectionWebApplicationFactory _factory = new();

        public Task InitializeAsync() => _factory.InitializeAsync();
        public Task DisposeAsync() => _factory.DisposeAsync();

        [Fact]
        public async Task EndToEnd_Correction_ReviewQueue_FinalizesSessionPoints_AndUpdatesAdminBinsSummary()
        {
            int surveyId = 0;
            int sessionId = 0;
            int item1Id = 0;
            int item2Id = 0;

            await _factory.ExecuteDbAsync(async db =>
            {
                var session = new DisposalSession
                {
                    UserId = _factory.Citizen1Id,
                    BinId = _factory.AvailableBinId,
                    StartTime = DateTime.UtcNow.AddMinutes(-2),
                    EndTime = DateTime.UtcNow.AddMinutes(-1),
                    Status = SessionStatus.Terminated,
                    PointsStatus = PointsStatus.Pending
                };
                db.DisposalSessions.Add(session);
                await db.SaveChangesAsync();
                sessionId = session.SessionId;

                var item1 = new DisposalItem
                {
                    SessionId = sessionId,
                    WasteTypeId = 1, // PLASTIC = 15
                    EstimatedPoints = 15,
                    Image = "https://cdn.test/item1.jpg",
                    AIConfidence = 0.91m,
                    DetectedAt = DateTime.UtcNow
                };
                var item2 = new DisposalItem
                {
                    SessionId = sessionId,
                    WasteTypeId = 2, // METAL = 20
                    EstimatedPoints = 20,
                    Image = "https://cdn.test/item2.jpg",
                    AIConfidence = 0.72m,
                    DetectedAt = DateTime.UtcNow
                };
                db.DisposalItems.AddRange(item1, item2);
                await db.SaveChangesAsync();

                item1Id = item1.ItemId;
                item2Id = item2.ItemId;

                var survey = new DisposalSurvey
                {
                    SessionId = sessionId,
                    TotalCalculatedPoints = 35,
                    CreatedAt = DateTime.UtcNow,
                    Status = SurveyStatus.Waiting
                };
                db.DisposalSurveys.Add(survey);
                await db.SaveChangesAsync();
                surveyId = survey.SurveyId;
            });

            // 1. Citizen submits corrections for BOTH items
            using var citizenClient = _factory.CreateAuthorizedClient(_factory.Citizen1Id, RoleNames.Citizen);
            var submitResp = await citizenClient.PostAsJsonAsync($"/api/v1/surveys/{surveyId}/submit", new
            {
                aiRating = 3,
                items = new[]
                {
                    new { itemId = item1Id, confirmedWasteType = "PAPER" },
                    new { itemId = item2Id, confirmedWasteType = "ORGANIC" }
                }
            });
            Assert.Equal(HttpStatusCode.OK, submitResp.StatusCode);

            using var submitDoc = JsonDocument.Parse(await submitResp.Content.ReadAsStringAsync());
            var reportIds = submitDoc.RootElement.GetProperty("data").GetProperty("flaggedReportIds")
                .EnumerateArray().Select(e => e.GetInt32()).ToList();
            Assert.Equal(2, reportIds.Count);

            // Admin broadcast notification created
            var notifCount = await _factory.ExecuteDbAsync(db =>
                db.NotificationRecipients.CountAsync(nr => nr.UserId == _factory.AdminId));
            Assert.Equal(1, notifCount);

            // 2. Admin lists pending inspections & checks detail
            using var adminClient = _factory.CreateAuthorizedClient(_factory.AdminId, RoleNames.Admin);
            var listResp = await adminClient.GetAsync("/api/v1/admin/inspections?status=pending&sortBy=mlConfidence&sortDir=asc");
            Assert.Equal(HttpStatusCode.OK, listResp.StatusCode);

            using var listDoc = JsonDocument.Parse(await listResp.Content.ReadAsStringAsync());
            Assert.Equal(2, listDoc.RootElement.GetProperty("data").GetArrayLength());
            Assert.Equal(2, listDoc.RootElement.GetProperty("summary").GetProperty("pendingReviews").GetInt32());

            var detailResp = await adminClient.GetAsync($"/api/v1/admin/inspections/{reportIds[0]}");
            Assert.Equal(HttpStatusCode.OK, detailResp.StatusCode);

            // Retrain before review -> 409 REVIEW_REQUIRED
            var retrainEarlyResp = await adminClient.PostAsync($"/api/v1/admin/inspections/{reportIds[0]}/retrain", null);
            Assert.Equal(HttpStatusCode.Conflict, retrainEarlyResp.StatusCode);

            // 3. Admin corrects report 1 to PAPER (10 pts) -> session still pending report 2
            var correctResp = await adminClient.PostAsJsonAsync($"/api/v1/admin/inspections/{reportIds[0]}/correct", new
            {
                wasteTypeId = "PAPER"
            });
            Assert.Equal(HttpStatusCode.OK, correctResp.StatusCode);
            using var correctDoc = JsonDocument.Parse(await correctResp.Content.ReadAsStringAsync());
            Assert.False(correctDoc.RootElement.GetProperty("data").GetProperty("sessionPointsFinalized").GetBoolean());

            // 4. Admin dismisses report 2 (keeps METAL = 20 pts) -> whole session finalized ONCE = 10 + 20 = 30 pts
            var dismissResp = await adminClient.PostAsync($"/api/v1/admin/inspections/{reportIds[1]}/dismiss", null);
            Assert.Equal(HttpStatusCode.OK, dismissResp.StatusCode);
            using var dismissDoc = JsonDocument.Parse(await dismissResp.Content.ReadAsStringAsync());
            var dismissData = dismissDoc.RootElement.GetProperty("data");
            Assert.True(dismissData.GetProperty("sessionPointsFinalized").GetBoolean());
            Assert.Equal(30, dismissData.GetProperty("pointsAwarded").GetInt32());
            Assert.True(dismissData.GetProperty("transactionId").GetInt32() > 0);

            // Verify wallet & audit logs
            var wallet = await _factory.ExecuteDbAsync(db =>
                db.Wallets.AsNoTracking().FirstAsync(w => w.UserId == _factory.Citizen1Id));
            Assert.Equal(30, wallet.AvailablePoints);
            Assert.Equal(30, wallet.LifetimeEarnedPoints);

            // 5. Queue report 1 for retraining
            var retrainResp = await adminClient.PostAsync($"/api/v1/admin/inspections/{reportIds[0]}/retrain", null);
            Assert.Equal(HttpStatusCode.OK, retrainResp.StatusCode);

            var auditCount = await _factory.ExecuteDbAsync(db => db.AuditLogs.CountAsync());
            Assert.Equal(3, auditCount);

            // 6. Admin bins summary (E50) reflects live DB metrics
            var adminBinsResp = await adminClient.GetAsync("/api/v1/admin/bins");
            Assert.Equal(HttpStatusCode.OK, adminBinsResp.StatusCode);
            using var binsDoc = JsonDocument.Parse(await adminBinsResp.Content.ReadAsStringAsync());
            var binsSummary = binsDoc.RootElement.GetProperty("summary");
            Assert.Equal(0, binsSummary.GetProperty("pendingReviews").GetInt32());
            Assert.Equal(2, binsSummary.GetProperty("reviewedReports").GetInt32());
            Assert.Equal(2, binsSummary.GetProperty("labelledImages").GetInt32());
        }
    }
}