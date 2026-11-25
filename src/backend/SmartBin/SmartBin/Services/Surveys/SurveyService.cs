using Microsoft.EntityFrameworkCore;
using SmartBin.DTOs.Sessions;
using SmartBin.DTOs.Surveys;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;
using SmartBin.Repositories.Sessions;
using SmartBin.Repositories.Surveys;
using SmartBin.Services.Wallets;

namespace SmartBin.Services.Surveys
{
    public class SurveyService : ISurveyService
    {
        private readonly ISessionRepository _sessionRepository;
        private readonly ISurveyRepository _surveyRepository;
        private readonly IBinRepository _binRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IWalletService _walletService;
        private readonly IMember5InspectionService _member5InspectionService;

        public SurveyService(
            ISessionRepository sessionRepository,
            ISurveyRepository surveyRepository,
            IBinRepository binRepository,
            IUnitOfWork unitOfWork,
            IWalletService walletService,
            IMember5InspectionService member5InspectionService)
        {
            _sessionRepository = sessionRepository;
            _surveyRepository = surveyRepository;
            _binRepository = binRepository;
            _unitOfWork = unitOfWork;
            _walletService = walletService;
            _member5InspectionService = member5InspectionService;
        }

        public async Task<SessionSurveyResponseDto> GetSessionSurveyAsync(
            int userId,
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            if (sessionId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid sessionId.",
                    new[] { new { field = "sessionId", message = "sessionId must be a positive integer." } });
            }

            var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);

            if (session == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Disposal session not found.");
            }

            if (session.UserId != userId)
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "FORBIDDEN",
                    "You do not own this session.");
            }

            if (string.Equals(session.Status, SessionStatus.Active, StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SESSION_ACTIVE",
                    "The session is still active. End the session before accessing its survey.");
            }

            if (session.Survey == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Survey not found for this session.");
            }

            if (!string.Equals(session.Survey.Status, SurveyStatus.Waiting, StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SURVEY_ALREADY_RESOLVED",
                    "This survey has already been submitted.");
            }

            var items = session.Items
                .OrderBy(i => i.ItemId)
                .Select(i => new SessionItemDto
                {
                    ItemId = i.ItemId,
                    WasteType = i.WasteType != null ? i.WasteType.Name : string.Empty,
                    EstimatedPoints = i.EstimatedPoints
                })
                .ToList();

            return new SessionSurveyResponseDto
            {
                SurveyId = session.Survey.SurveyId,
                SessionId = session.SessionId,
                Status = session.Survey.Status,
                Items = items,
                TotalPoints = items.Sum(i => i.EstimatedPoints)
            };
        }

        public async Task<ConfirmSurveyResponseDto> ConfirmSurveyAsync(
            int userId,
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            if (sessionId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid sessionId.",
                    new[] { new { field = "sessionId", message = "sessionId must be a positive integer." } });
            }

            var session = await _sessionRepository.GetByIdAsync(sessionId, cancellationToken);

            if (session == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Disposal session not found.");
            }

            if (session.UserId != userId)
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "FORBIDDEN",
                    "You do not own this session.");
            }

            if (string.Equals(session.Status, SessionStatus.Active, StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SESSION_ACTIVE",
                    "The session is still active. End the session before confirming its survey.");
            }

            if (session.Survey == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Survey not found for this session.");
            }

            if (!string.Equals(session.Survey.Status, SurveyStatus.Waiting, StringComparison.Ordinal) ||
                string.Equals(session.PointsStatus, PointsStatus.Awarded, StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SURVEY_ALREADY_RESOLVED",
                    "This survey has already been submitted.");
            }

            var now = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var totalPoints = await _surveyRepository.GetTotalItemPointsAsync(sessionId, cancellationToken);

                var confirmed = await _surveyRepository.ConfirmSurveyAndSessionAsync(
                    session.Survey.SurveyId,
                    sessionId,
                    totalPoints,
                    now,
                    cancellationToken);

                if (!confirmed)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "SURVEY_ALREADY_RESOLVED",
                        "This survey has already been submitted.");
                }

                var (newAvailablePoints, newLifetimePoints) = await _walletService.CreditSessionPointsAsync(
                    userId,
                    sessionId,
                    totalPoints,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                return new ConfirmSurveyResponseDto
                {
                    SessionId = sessionId,
                    SurveyStatus = SurveyStatus.Done,
                    Outcome = SurveyOutcome.Confirmed,
                    PointsStatus = PointsStatus.Awarded,
                    PointsAwarded = totalPoints,
                    NewAvailablePoints = newAvailablePoints,
                    NewLifetimePoints = newLifetimePoints
                };
            }
            catch (DbUpdateException)
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SURVEY_ALREADY_RESOLVED",
                    "This survey has already been submitted.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task<(List<MySurveyItemDto> Items, SurveyPaginationMetaDto Meta)> GetMySurveysAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var normalizedStatus = string.IsNullOrWhiteSpace(status)
                ? "all"
                : status.Trim().ToLowerInvariant();

            if (normalizedStatus != "all" &&
                normalizedStatus != SurveyStatus.Waiting &&
                normalizedStatus != SurveyStatus.Done)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid status filter.",
                    new[] { new { field = "status", message = "Must be all, waiting or done." } });
            }

            if (page < 1)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "page", message = "page must be greater than or equal to 1." } });
            }

            if (pageSize < 1 || pageSize > 100)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "pageSize", message = "pageSize must be between 1 and 100." } });
            }

            var (items, totalItems, pendingPoints) = await _surveyRepository.GetMySurveysPagedAsync(
                userId,
                normalizedStatus,
                page,
                pageSize,
                cancellationToken);

            var totalPages = totalItems == 0
                ? 0
                : (int)Math.Ceiling(totalItems / (double)pageSize);

            var meta = new SurveyPaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages,
                PendingPoints = pendingPoints
            };

            return (items, meta);
        }

        public async Task<SurveyDetailResponseDto> GetSurveyDetailsAsync(
            int userId,
            int surveyId,
            CancellationToken cancellationToken = default)
        {
            if (surveyId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid surveyId.",
                    new[] { new { field = "surveyId", message = "surveyId must be a positive integer." } });
            }

            var surveyDto = await _surveyRepository.GetSurveyDetailsDtoAsync(userId, surveyId, cancellationToken);
            if (surveyDto == null)
            {
                var exists = await _surveyRepository.GetByIdAsync(surveyId, cancellationToken);
                if (exists == null)
                {
                    throw new ApiException(
                        StatusCodes.Status404NotFound,
                        "NOT_FOUND",
                        "Survey not found.");
                }

                if (exists.Session?.UserId != userId)
                {
                    throw new ApiException(
                        StatusCodes.Status403Forbidden,
                        "FORBIDDEN",
                        "You do not own this survey.");
                }

                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Survey not found.");
            }

            return surveyDto;
        }

        public async Task<SubmitSurveyCorrectionsResponseDto> SubmitCorrectionsAsync(
            int userId,
            int surveyId,
            SubmitSurveyCorrectionsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (surveyId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid surveyId.",
                    new[] { new { field = "surveyId", message = "surveyId must be a positive integer." } });
            }

            if (request == null)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Request body is required.");
            }

            if (!request.AiRating.HasValue || request.AiRating.Value < 1 || request.AiRating.Value > 5)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid aiRating.",
                    new[] { new { field = "aiRating", message = "aiRating must be an integer between 1 and 5." } });
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "At least one item must be submitted.",
                    new[] { new { field = "items", message = "items must contain at least one element." } });
            }

            if (request.Items.Any(i => i == null || i.ItemId <= 0 || string.IsNullOrWhiteSpace(i.ConfirmedWasteType)))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Each item requires a positive itemId and a non-empty confirmedWasteType.",
                    new[] { new { field = "items", message = "Invalid item entry." } });
            }

            if (request.Items.Select(i => i.ItemId).Distinct().Count() != request.Items.Count)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Duplicate itemId values are not allowed.",
                    new[] { new { field = "items", message = "Duplicate itemId found in submission." } });
            }

            var survey = await _surveyRepository.GetByIdAsync(surveyId, cancellationToken);

            if (survey == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Survey not found.");
            }

            if (survey.Session == null || survey.Session.UserId != userId)
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "FORBIDDEN",
                    "You do not own this survey.");
            }

            if (!string.Equals(survey.Status, SurveyStatus.Waiting, StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SURVEY_ALREADY_RESOLVED",
                    "This survey has already been submitted.");
            }

            var sessionItemsById = survey.Session.Items.ToDictionary(i => i.ItemId);

            foreach (var submittedItem in request.Items)
            {
                if (!sessionItemsById.ContainsKey(submittedItem.ItemId))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        $"Item {submittedItem.ItemId} does not belong to this session.",
                        new[] { new { field = "items", message = $"Item {submittedItem.ItemId} does not belong to session {survey.SessionId}." } });
                }
            }

            var wasteTypes = await _binRepository.GetAllWasteTypesAsync(cancellationToken);

            var wasteTypesByName = wasteTypes.ToDictionary(
                wt => wt.Name.ToUpperInvariant(),
                wt => wt);

            var resolvedEntries = new List<(int ItemId, int AiWasteTypeId, int SelectedWasteTypeId, bool IsCorrect, string ImageUrl, decimal? AiConfidence)>();

            foreach (var submittedItem in request.Items)
            {
                var normalizedWasteType = submittedItem.ConfirmedWasteType.Trim().ToUpperInvariant();
                if (!wasteTypesByName.TryGetValue(normalizedWasteType, out var selectedWasteType))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        $"Unknown waste type '{submittedItem.ConfirmedWasteType}'.",
                        new[] { new { field = "confirmedWasteType", message = $"Unknown waste type '{submittedItem.ConfirmedWasteType}'." } });
                }

                var sessionItem = sessionItemsById[submittedItem.ItemId];
                bool isCorrect = selectedWasteType.WasteTypeId == sessionItem.WasteTypeId;

                resolvedEntries.Add((
                    submittedItem.ItemId,
                    sessionItem.WasteTypeId,
                    selectedWasteType.WasteTypeId,
                    isCorrect,
                    sessionItem.Image,
                    sessionItem.AIConfidence));
            }

            var disputedEntries = resolvedEntries.Where(e => !e.IsCorrect).ToList();
            if (disputedEntries.Count == 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "No conflicting classifications found. Use POST /api/v1/sessions/{sessionId}/survey/confirm to confirm all classifications.",
                    new[] { new { field = "items", message = "At least one item must differ from the AI classification." } });
            }

            var now = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var responses = resolvedEntries.Select(e => new SurveyResponse
                {
                    SurveyId = surveyId,
                    ItemId = e.ItemId,
                    IsCorrect = e.IsCorrect,
                    UserSelectedTypeId = e.IsCorrect ? null : e.SelectedWasteTypeId,
                    CreatedAt = now
                }).ToList();

                var submitted = await _surveyRepository.SubmitCorrectionsAsync(
                    surveyId,
                    now,
                    responses,
                    cancellationToken);

                if (!submitted)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "SURVEY_ALREADY_RESOLVED",
                        "This survey has already been submitted.");
                }

                var reportRequest = new CreateInspectionReportsRequestDto
                {
                    SessionId = survey.SessionId,
                    SurveyId = survey.SurveyId,
                    UserId = userId,
                    AiRating = request.AiRating.Value,
                    DisputedItems = disputedEntries.Select(e => new CreateDisputedReportItemDto
                    {
                        ItemId = e.ItemId,
                        AiWasteTypeId = e.AiWasteTypeId,
                        UserSelectedWasteTypeId = e.SelectedWasteTypeId,
                        ImageUrl = e.ImageUrl,
                        AiConfidence = e.AiConfidence
                    }).ToList()
                };

                var flaggedReportIds = await _member5InspectionService.CreateInspectionReportsAsync(
                    reportRequest,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                return new SubmitSurveyCorrectionsResponseDto
                {
                    SurveyId = survey.SurveyId,
                    SessionId = survey.SessionId,
                    SurveyStatus = SurveyStatus.Done,
                    Outcome = SurveyOutcome.CorrectionSubmitted,
                    PointsStatus = PointsStatus.Pending,
                    PointsAwarded = null,
                    FlaggedReportIds = flaggedReportIds
                };
            }
            catch (DbUpdateException)
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SURVEY_ALREADY_RESOLVED",
                    "This survey has already been submitted.");
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        public async Task FinalizeSessionPointsAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            if (sessionId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid sessionId.");
            }

            var session = await _sessionRepository.GetByIdWithItemsAsync(sessionId, cancellationToken);

            if (session == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Disposal session not found.");
            }

            if (string.Equals(session.PointsStatus, PointsStatus.Awarded, StringComparison.Ordinal))
            {
                return;
            }

            var reports = await _member5InspectionService.GetSessionReportsAsync(sessionId, cancellationToken);
            if (reports.Any(r => !r.IsResolved))
            {
                return;
            }

            var wasteTypesById = await _binRepository.GetWasteTypesDictionaryAsync(cancellationToken);

            var reportsByItemId = reports
                .GroupBy(r => r.ItemId)
                .ToDictionary(g => g.Key, g => g.Last());

            int totalFinalPoints = 0;
            foreach (var item in session.Items)
            {
                if (reportsByItemId.TryGetValue(item.ItemId, out var report) &&
                    report.IsAccepted &&
                    report.AdminConfirmedWasteTypeId.HasValue &&
                    wasteTypesById.TryGetValue(report.AdminConfirmedWasteTypeId.Value, out var adminWasteType))
                {
                    totalFinalPoints += adminWasteType.BasePoints;
                }
                else
                {
                    totalFinalPoints += item.EstimatedPoints;
                }
            }

            bool ownsTransaction = !_unitOfWork.HasActiveTransaction;
            if (ownsTransaction)
            {
                await _unitOfWork.BeginTransactionAsync(cancellationToken);
            }

            try
            {
                var updated = await _surveyRepository.FinalizeSessionPointsAsync(sessionId, totalFinalPoints, cancellationToken);
                if (!updated)
                {
                    if (ownsTransaction)
                    {
                        await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                    }
                    return;
                }

                await _walletService.CreditSessionPointsAsync(
                    session.UserId,
                    sessionId,
                    totalFinalPoints,
                    cancellationToken);

                if (ownsTransaction)
                {
                    await _unitOfWork.CommitTransactionAsync(cancellationToken);
                }
            }
            catch
            {
                if (ownsTransaction)
                {
                    await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                }

                throw;
            }
        }
    }
}
