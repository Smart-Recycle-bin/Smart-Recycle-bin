using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Surveys;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Surveys
{
    public class SurveyRepository : ISurveyRepository
    {
        private readonly AppDbContext _context;

        public SurveyRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DisposalSurvey?> GetBySessionIdAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSurveys
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
        }

        public async Task<DisposalSurvey?> GetByIdAsync(int surveyId, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSurveys
                .Include(s => s.Session)
                    .ThenInclude(sess => sess.Items)
                        .ThenInclude(i => i.WasteType)
                .Include(s => s.Responses)
                .FirstOrDefaultAsync(s => s.SurveyId == surveyId, cancellationToken);
        }

        public async Task<DisposalSurvey> EnsureSurveyCreatedAsync(
            int sessionId,
            DateTime createdAt,
            CancellationToken cancellationToken = default)
        {
            var existing = await _context.DisposalSurveys
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);

            if (existing != null)
            {
                return existing;
            }

            var totalCalculatedPoints = await _context.DisposalItems
                .AsNoTracking()
                .Where(di => di.SessionId == sessionId)
                .SumAsync(di => (int?)di.EstimatedPoints, cancellationToken) ?? 0;

            var survey = new DisposalSurvey
            {
                SessionId = sessionId,
                TotalCalculatedPoints = totalCalculatedPoints,
                CreatedAt = createdAt,
                Status = SurveyStatus.Waiting
            };

            try
            {
                await _context.DisposalSurveys.AddAsync(survey, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
                _context.Entry(survey).State = EntityState.Detached;
                return survey;
            }
            catch (DbUpdateException)
            {
                _context.Entry(survey).State = EntityState.Detached;
                var concurrent = await _context.DisposalSurveys
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);

                if (concurrent != null)
                {
                    return concurrent;
                }

                throw;
            }
        }

        public async Task<bool> ConfirmSurveyAndSessionAsync(
            int surveyId,
            int sessionId,
            int totalPoints,
            DateTime submittedAt,
            CancellationToken cancellationToken = default)
        {
            var surveyRows = await _context.DisposalSurveys
                .Where(s => s.SurveyId == surveyId && s.Status == SurveyStatus.Waiting)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.Status, SurveyStatus.Done)
                    .SetProperty(s => s.Outcome, SurveyOutcome.Confirmed)
                    .SetProperty(s => s.SubmittedAt, submittedAt)
                    .SetProperty(s => s.TotalCalculatedPoints, totalPoints),
                    cancellationToken);

            if (surveyRows == 0)
            {
                return false;
            }

            var sessionRows = await _context.DisposalSessions
                .Where(s => s.SessionId == sessionId && s.PointsStatus == PointsStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.PointsStatus, PointsStatus.Awarded)
                    .SetProperty(s => s.TotalPoints, totalPoints),
                    cancellationToken);

            return sessionRows > 0;
        }

        public async Task<(List<MySurveyItemDto> Items, int TotalItems, int PendingPoints)> GetMySurveysPagedAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var pendingSessionIds = _context.DisposalSurveys
                .AsNoTracking()
                .Where(s => s.Session != null &&
                            s.Session.UserId == userId &&
                            s.Session.PointsStatus == PointsStatus.Pending)
                .Select(s => s.SessionId);

            var pendingPoints = await _context.DisposalItems
                .AsNoTracking()
                .Where(di => pendingSessionIds.Contains(di.SessionId))
                .SumAsync(di => (int?)di.EstimatedPoints, cancellationToken) ?? 0;

            var query = _context.DisposalSurveys
                .AsNoTracking()
                .Where(s => s.Session != null && s.Session.UserId == userId);

            if (status == SurveyStatus.Waiting)
            {
                query = query.Where(s => s.Status == SurveyStatus.Waiting);
            }
            else if (status == SurveyStatus.Done)
            {
                query = query.Where(s => s.Status == SurveyStatus.Done);
            }

            var totalItems = await query.CountAsync(cancellationToken);

            var rawItems = await query
                .OrderByDescending(s => s.CreatedAt)
                .ThenByDescending(s => s.SurveyId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new
                {
                    s.SurveyId,
                    s.SessionId,
                    BinId = s.Session!.BinId,
                    s.Status,
                    s.Outcome,
                    PointsStatus = s.Session.PointsStatus,
                    EstimatedPoints = s.Session.Items.Sum(i => (int?)i.EstimatedPoints) ?? s.TotalCalculatedPoints,
                    SessionTotalPoints = s.Session.TotalPoints,
                    s.CreatedAt
                })
                .ToListAsync(cancellationToken);

            var items = rawItems.Select(x => new MySurveyItemDto
            {
                SurveyId = x.SurveyId,
                SurveyNumber = x.SurveyId,
                SessionId = x.SessionId,
                BinId = x.BinId,
                BinName = $"Bin#{x.BinId:D3}",
                Status = x.Status,
                Outcome = x.Outcome,
                PointsStatus = x.PointsStatus,
                EstimatedPoints = x.EstimatedPoints,
                PointsAwarded = string.Equals(x.PointsStatus, PointsStatus.Awarded, StringComparison.Ordinal)
                    ? x.SessionTotalPoints
                    : null,
                CreatedAt = x.CreatedAt
            }).ToList();

            return (items, totalItems, pendingPoints);
        }

        public async Task<SurveyDetailResponseDto?> GetSurveyDetailsDtoAsync(
            int userId,
            int surveyId,
            CancellationToken cancellationToken = default)
        {
            var survey = await _context.DisposalSurveys
                .AsNoTracking()
                .Include(s => s.Session)
                    .ThenInclude(sess => sess.Bin)
                .Include(s => s.Session)
                    .ThenInclude(sess => sess.Items)
                        .ThenInclude(i => i.WasteType)
                .FirstOrDefaultAsync(s => s.SurveyId == surveyId, cancellationToken);

            if (survey == null || survey.Session == null)
            {
                return null;
            }

            if (survey.Session.UserId != userId)
            {
                return null;
            }

            var items = survey.Session.Items
                .OrderBy(i => i.ItemId)
                .Select(i => new SurveyDetailItemDto
                {
                    ItemId = i.ItemId,
                    DetectedWasteType = i.WasteType != null ? i.WasteType.Name : "Plastic",
                    ConfirmedWasteType = i.WasteType != null ? i.WasteType.Name : "Plastic",
                    Points = i.EstimatedPoints,
                    ImageUrl = i.Image ?? "https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300",
                    IsCorrected = false
                })
                .ToList();

            var totalPoints = items.Sum(i => i.Points);
            var timeAgo = survey.CreatedAt > DateTime.UtcNow.AddHours(-1)
                ? $"{(int)Math.Max(1, (DateTime.UtcNow - survey.CreatedAt).TotalMinutes)} min ago"
                : survey.CreatedAt.ToString("MMM dd, h:mm tt");

            return new SurveyDetailResponseDto
            {
                SurveyId = survey.SurveyId,
                SurveyNumber = survey.SurveyId,
                SessionId = survey.SessionId,
                BinId = survey.Session.BinId,
                BinName = survey.Session.Bin != null ? $"Bin#{survey.Session.Bin.BinId:D3}" : $"Bin#{survey.Session.BinId:D3}",
                Status = survey.Status,
                Points = totalPoints,
                TimeAgo = timeAgo,
                Items = items
            };
        }

        public async Task<bool> SubmitCorrectionsAsync(
            int surveyId,
            DateTime submittedAt,
            List<SurveyResponse> responses,
            CancellationToken cancellationToken = default)
        {
            var updatedRows = await _context.DisposalSurveys
                .Where(s => s.SurveyId == surveyId && s.Status == SurveyStatus.Waiting)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.Status, SurveyStatus.Done)
                    .SetProperty(s => s.Outcome, SurveyOutcome.CorrectionSubmitted)
                    .SetProperty(s => s.SubmittedAt, submittedAt),
                    cancellationToken);

            if (updatedRows == 0)
            {
                return false;
            }

            await _context.SurveyResponses.AddRangeAsync(responses, cancellationToken);
            return true;
        }

        public async Task<bool> FinalizeSessionPointsAsync(
            int sessionId,
            int totalFinalPoints,
            CancellationToken cancellationToken = default)
        {
            var updatedRows = await _context.DisposalSessions
                .Where(s => s.SessionId == sessionId && s.PointsStatus == PointsStatus.Pending)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.PointsStatus, PointsStatus.Awarded)
                    .SetProperty(s => s.TotalPoints, totalFinalPoints),
                    cancellationToken);

            if (updatedRows == 0)
            {
                return false;
            }

            await _context.DisposalSurveys
                .Where(s => s.SessionId == sessionId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.TotalCalculatedPoints, totalFinalPoints),
                    cancellationToken);

            return true;
        }

        public async Task<int> GetTotalItemPointsAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalItems
                .AsNoTracking()
                .Where(di => di.SessionId == sessionId)
                .SumAsync(di => (int?)di.EstimatedPoints, cancellationToken) ?? 0;
        }

        public async Task<DisposalSurvey?> GetSurveyWithResponsesAsync(int surveyId, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSurveys
                .Include(ds => ds.Responses)
                .FirstOrDefaultAsync(ds => ds.SurveyId == surveyId, cancellationToken);
        }
    }
}
