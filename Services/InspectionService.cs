using depi_project.Data.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Threading;
using System;
using Microsoft.EntityFrameworkCore;

namespace EcoBin.Api;

public interface IInspectionService
{
    Task<InspectionListResponse> ListAsync(string? status, string? search, string? sortBy, string? sortDir, int page, int pageSize, CancellationToken ct);
    Task<InspectionDetail> GetAsync(int reportId, CancellationToken ct);
    Task<ResolveResult> CorrectAsync(int adminId, int reportId, string? wasteTypeName, CancellationToken ct);
    Task<ResolveResult> DismissAsync(int adminId, int reportId, CancellationToken ct);
    Task<RetrainResult> RetrainAsync(int adminId, int reportId, CancellationToken ct);

    /// <summary>For Yousefe (E50).</summary>
    Task<InspectionSummary> GetSummaryAsync(CancellationToken ct);

    /// <summary>For Abobakr (E26): create one report per disputed item.</summary>
    Task<List<int>> CreateReportsAsync(int surveyId, List<NewInspectionReport> items, CancellationToken ct);
}

public class InspectionService(EcoBinDbContext db, IAuditLogService audit, ISessionPointsService sessions) : IInspectionService
{
    // ---------------- E65: review queue ----------------
    public async Task<InspectionListResponse> ListAsync(
        string? status, string? search, string? sortBy, string? sortDir, int page, int pageSize, CancellationToken ct)
    {
        (page, pageSize) = ApiResponse.Normalize(page, pageSize);

        if (!string.IsNullOrWhiteSpace(status))
        {
            status = status.Trim().ToLowerInvariant();
            if (status is not (Review.Pending or Review.Approved or Review.Rejected))
                throw AppException.Validation("status", "Must be one of: pending, approved, rejected.");
        }

        // One row per report, with the data we need from the other tables.
        var query = from r in db.InspectionReports.AsNoTracking()
                    join s in db.DisposalSurveys on r.SurveyId equals s.SurveyId
                    join session in db.DisposalSessions on s.SessionId equals session.SessionId
                    join item in db.DisposalItems on r.DisposalItemId equals item.ItemId
                    join w in db.WasteTypes on item.WasteTypeId equals w.WasteTypeId
                    select new { Report = r, session.SessionId, session.BinId, Item = item, WasteName = w.Name };

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.Report.ReviewDecision == status);

        // if (!string.IsNullOrWhiteSpace(search))
        // {
        //     var term = search.Trim().ToLower();
        //     if (int.TryParse(term, out var number))   // "12" -> report 12, session 12 or bin 12
        //         query = query.Where(x => x.Report.ReportId == number || x.SessionId == number || x.BinId == number);
        //     else                                       // "plastic" -> waste type name
        //         query = query.Where(x => x.WasteName.ToLower().Contains(term));
        // }
        //if (!string.IsNullOrWhiteSpace(search))
        //{
        //    var term = search.Trim().ToLower();
        //    var digits = new string(term.Where(char.IsDigit).ToArray());
        //    if (int.TryParse(digits, out var number))
        //        query = query.Where(x => x.Report.ReportId == number || x.SessionId == number || x.BinId == number);
        //    else
        //        query = query.Where(x => x.WasteName.ToLower().Contains(term));
        //}

        //var asc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        //if (string.Equals(sortBy, "mlConfidence", StringComparison.OrdinalIgnoreCase))
        //    query = asc ? query.OrderBy(x => x.Item.AiConfidence) : query.OrderByDescending(x => x.Item.AiConfidence);
        //else   // default: createdAt
        //    query = asc ? query.OrderBy(x => x.Report.CreatedAt) : query.OrderByDescending(x => x.Report.CreatedAt);

        // 1) In ListAsync — replace search & sort blocks:
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            var digits = new string(term.Where(char.IsDigit).ToArray());
            var hasNumber = int.TryParse(digits, out var number);

            var words = term.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var matchedWasteTypes = Settings.WasteTypeNames
                .Where(w => words.Any(word => w.Contains(word, StringComparison.OrdinalIgnoreCase))
                         || w.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();

            if (hasNumber && matchedWasteTypes.Count > 0)
            {
                query = query.Where(x =>
                    (x.Report.ReportId == number || x.SessionId == number || x.BinId == number) &&
                    matchedWasteTypes.Contains(x.WasteName.ToUpper()));
            }
            else if (hasNumber)
            {
                query = query.Where(x => x.Report.ReportId == number || x.SessionId == number || x.BinId == number);
            }
            else if (term is "bin" or "smart" or "smart bin")
            {
                // Matches bin name prefix ("Smart Bin #..."); no extra filter needed
            }
            else
            {
                query = query.Where(x => x.WasteName.ToLower().Contains(term));
            }
        }

        var asc = string.Equals(sortDir, "asc", StringComparison.OrdinalIgnoreCase);
        query = sortBy?.ToLowerInvariant() switch
        {
            "mlconfidence" => asc
                ? query.OrderBy(x => x.Item.AiConfidence).ThenBy(x => x.Report.ReportId)
                : query.OrderByDescending(x => x.Item.AiConfidence).ThenByDescending(x => x.Report.ReportId),
            _ => asc
                ? query.OrderBy(x => x.Report.CreatedAt).ThenBy(x => x.Report.ReportId)
                : query.OrderByDescending(x => x.Report.CreatedAt).ThenByDescending(x => x.Report.ReportId)
        };

        var total = await query.CountAsync(ct);
        var rows = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        var items = rows.Select(x => new InspectionListItem(
            x.Report.ReportId, x.SessionId, x.BinId, $"Smart Bin #{x.BinId}",
            x.Item.Image ?? "", x.WasteName.ToUpperInvariant(), x.Item.AiConfidence,
            x.Report.Feedback, x.Report.CreatedAt,
            DecisionForClient(x.Report.ReviewDecision), x.Report.RetrainingStatus)).ToList();   // no thumbnail column: we return the original image

        return new InspectionListResponse(items, await GetSummaryAsync(ct), total);
    }

    // Counters shown on top of the review screen (and used by E50).
    public async Task<InspectionSummary> GetSummaryAsync(CancellationToken ct)
    {
        var pending = await db.InspectionReports.CountAsync(r => r.ReviewDecision == Review.Pending, ct);
        var reviewed = await db.InspectionReports.CountAsync(r => r.ReviewDecision != Review.Pending, ct);
        var labelled = reviewed;   // ASSUMPTION: every reviewed report = one labelled image
        return new InspectionSummary(
            labelled, pending, reviewed,
            Math.Max(0, Settings.RetrainingThreshold - labelled),
            Settings.RetrainingThreshold);
    }

    // ---------------- E67: one report ----------------
    public async Task<InspectionDetail> GetAsync(int reportId, CancellationToken ct)
    {
        var report = await db.InspectionReports.AsNoTracking().FirstOrDefaultAsync(r => r.ReportId == reportId, ct)
            ?? throw AppException.NotFound("Inspection report not found.");

        var survey = await db.DisposalSurveys.AsNoTracking().FirstAsync(s => s.SurveyId == report.SurveyId, ct);
        var session = await db.DisposalSessions.AsNoTracking().FirstAsync(s => s.SessionId == survey.SessionId, ct);
        var item = await db.DisposalItems.AsNoTracking().FirstAsync(i => i.ItemId == report.DisposalItemId, ct);
        var predicted = await db.WasteTypes.AsNoTracking().FirstAsync(w => w.WasteTypeId == item.WasteTypeId, ct);
        var recycler = await db.Users.AsNoTracking().FirstAsync(u => u.UserId == session.UserId, ct);

        return new InspectionDetail(
            report.ReportId, session.SessionId, session.BinId, recycler.UserId, recycler.DisplayName,
            report.Feedback, predicted.Name.ToUpperInvariant(), item.EstimatedPoints,
            item.Image ?? "", DecisionForClient(report.ReviewDecision),
            report.RetrainingStatus, report.CreatedAt);
    }

    // ---------------- E68: admin corrects the AI label ----------------
    public async Task<ResolveResult> CorrectAsync(int adminId, int reportId, string? wasteTypeName, CancellationToken ct)
    {
        var name = wasteTypeName?.Trim().ToUpperInvariant();
        if (string.IsNullOrEmpty(name) || !Settings.WasteTypeNames.Contains(name))
            throw AppException.Validation("wasteTypeId", "Must be one of: PLASTIC, METAL, PAPER, ORGANIC, TRASH.");

        var wasteType = await db.WasteTypes.AsNoTracking().FirstOrDefaultAsync(w => w.Name.ToUpper() == name, ct)
            ?? throw AppException.Validation("wasteTypeId", "Waste type does not exist.");

        return await ResolveAsync(adminId, reportId, Review.Approved, wasteType, "INSPECTION_CORRECT", ct);
    }

    // ---------------- E69: admin keeps the AI label ----------------
    public Task<ResolveResult> DismissAsync(int adminId, int reportId, CancellationToken ct) =>
        ResolveAsync(adminId, reportId, Review.Rejected, null, "INSPECTION_DISMISS", ct);

    // E68 and E69 do the same steps; only the decision and the corrected waste type differ.
    // 2) Replace ResolveAsync:
    private async Task<ResolveResult> ResolveAsync(
        int adminId, int reportId, string decision, WasteType? corrected, string actionType, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var meta = await (from r in db.InspectionReports.AsNoTracking()
                          join s in db.DisposalSurveys.AsNoTracking() on r.SurveyId equals s.SurveyId
                          where r.ReportId == reportId
                          select new { s.SessionId }).FirstOrDefaultAsync(ct)
            ?? throw AppException.NotFound("Inspection report not found.");

        // Serialize concurrent reviews in the same session (SQL Server)
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT 1 FROM DISPOSAL_SESSION WITH (UPDLOCK, HOLDLOCK) WHERE SessionId = {meta.SessionId}", ct);

        var report = await db.InspectionReports.FirstOrDefaultAsync(r => r.ReportId == reportId, ct)
            ?? throw AppException.NotFound("Inspection report not found.");
        if (report.ReviewDecision != Review.Pending)
            throw AppException.Conflict("CONFLICT", "This report has already been reviewed.");

        report.ReviewDecision = decision;
        report.ReviewedAt = DateTime.UtcNow;
        report.ReviewedByAdminId = adminId;
        if (corrected != null) report.CorrectedWasteTypeId = corrected.WasteTypeId;
        await db.SaveChangesAsync(ct);

        await audit.LogAsync(adminId, actionType, "INSPECTION_REPORT", reportId, null, ct);

        var stillPending = await (from r in db.InspectionReports
                                  join s in db.DisposalSurveys on r.SurveyId equals s.SurveyId
                                  where s.SessionId == meta.SessionId && r.ReviewDecision == Review.Pending
                                  select r.ReportId).AnyAsync(ct);

        ResolveResult result;
        if (stillPending)
        {
            result = new ResolveResult(reportId, decision, corrected?.Name.ToUpperInvariant(), false, null, null);
        }
        else
        {
            var fin = await sessions.FinalizeSessionPointsAsync(meta.SessionId, ct);
            result = new ResolveResult(reportId, decision, corrected?.Name.ToUpperInvariant(), true, fin.PointsAwarded, fin.TransactionId);
        }

        await tx.CommitAsync(ct);
        return result;
    }

    // ---------------- E70: send a reviewed report to retraining ----------------
    public async Task<RetrainResult> RetrainAsync(int adminId, int reportId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var report = await db.InspectionReports.FirstOrDefaultAsync(r => r.ReportId == reportId, ct)
            ?? throw AppException.NotFound("Inspection report not found.");
        if (report.ReviewDecision == Review.Pending)
            throw AppException.Conflict("REVIEW_REQUIRED", "Review the report before sending it for retraining.");
        if (report.RetrainingStatus is RetrainStatus.Queued or RetrainStatus.Sent)
            throw AppException.Conflict("CONFLICT", "This report is already queued or sent for retraining.");

        report.RetrainingStatus = RetrainStatus.Queued;
        await db.SaveChangesAsync(ct);
        await audit.LogAsync(adminId, "INSPECTION_RETRAIN", "INSPECTION_REPORT", reportId, null, ct);

        await tx.CommitAsync(ct);
        return new RetrainResult(reportId, report.RetrainingStatus);
    }

    // ---------------- Called by Member 2 when a user rejects a survey (E26) ----------------
    public async Task<List<int>> CreateReportsAsync(int surveyId, List<NewInspectionReport> items, CancellationToken ct)
    {
        // 3) At the top of CreateReportsAsync:
        if (items.Count == 0) return [];

        var now = DateTime.UtcNow;
        var reports = items.Select(i => new InspectionReport
        {
            SurveyId = surveyId,
            DisposalItemId = i.DisposalItemId,
            Feedback = i.Feedback,
            CreatedAt = now
        }).ToList();
        db.InspectionReports.AddRange(reports);

        // Tell every admin there is something to review (stored only, no push).
        var adminIds = await (from u in db.Users
                              join role in db.Roles on u.RoleId equals role.RoleId
                              where role.RoleName == RoleNames.Admin
                              select u.UserId).ToListAsync(ct);
        db.Notifications.Add(new Notification
        {
            Title = "New inspection reports",
            Message = $"{reports.Count} disputed item(s) are waiting for review.",
            Type = "warning",
            ResourceType = "DISPOSAL_SURVEY",
            ResourceId = surveyId.ToString(),
            CreatedAt = now,
            Recipients = adminIds.Select(id => new NotificationRecipient { UserId = id }).ToList()
        });

        await db.SaveChangesAsync(ct);
        return reports.Select(r => r.ReportId).ToList();
    }

    // The API shows null while a report is still waiting for review.
    private static string? DecisionForClient(string decision) => decision == Review.Pending ? null : decision;
}
