using SmartBin.DTOs.Sessions;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;
using SmartBin.Repositories.Sessions;
using SmartBin.Repositories.Surveys;

namespace SmartBin.Services.Sessions
{
    public class SessionService : ISessionService
    {
        private const int RollingWindowSeconds = 60;

        private readonly ISessionRepository _sessionRepository;
        private readonly ISurveyRepository _surveyRepository;
        private readonly IBinRepository _binRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ISessionRealtimeNotifier _realtimeNotifier;
        private readonly ILogger<SessionService> _logger;

        public SessionService(
            ISessionRepository sessionRepository,
            ISurveyRepository surveyRepository,
            IBinRepository binRepository,
            IUnitOfWork unitOfWork,
            ISessionRealtimeNotifier realtimeNotifier,
            ILogger<SessionService> logger)
        {
            _sessionRepository = sessionRepository;
            _surveyRepository = surveyRepository;
            _binRepository = binRepository;
            _unitOfWork = unitOfWork;
            _realtimeNotifier = realtimeNotifier;
            _logger = logger;
        }

        public async Task<StartSessionResponseDto> StartSessionAsync(
            int userId,
            int binId,
            StartSessionRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (binId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid binId.",
                    new[] { new { field = "binId", message = "binId must be a positive integer." } });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.QrPayload))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid request data.",
                    new[] { new { field = "qrPayload", message = "qrPayload is required." } });
            }

            var user = await _sessionRepository.GetUserAsync(userId, cancellationToken);

            if (user == null)
            {
                throw new ApiException(
                    StatusCodes.Status401Unauthorized,
                    "UNAUTHORIZED",
                    "Access token is missing or invalid.");
            }

            if (string.Equals(user.AccountStatus, "suspended", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "ACCOUNT_SUSPENDED",
                    "Your account is suspended.");
            }

            if (string.Equals(user.AccountStatus, "inactive", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status403Forbidden,
                    "ACCOUNT_INACTIVE",
                    "Your account is inactive.");
            }

            var bin = await _binRepository.GetByIdAsync(binId, cancellationToken);

            if (bin == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "BIN_NOT_FOUND",
                    "Bin not found.");
            }

            if (!string.Equals(bin.QRCode, request.QrPayload.Trim(), StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid QR payload.",
                    new[] { new { field = "qrPayload", message = "QR payload does not match the specified bin." } });
            }

            if (string.Equals(bin.Status, SmartBinStatus.NeedsService95, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(bin.Status, SmartBinStatus.Offline, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "BIN_UNSERVICEABLE",
                    "This bin is full or offline and cannot accept new sessions.");
            }

            var now = DateTime.UtcNow;
            var windowExpiresAt = now.AddSeconds(RollingWindowSeconds);

            var session = new DisposalSession
            {
                StartTime = now,
                Status = SessionStatus.Active,
                TotalPoints = 0,
                UserId = userId,
                BinId = bin.BinId,
                WindowExpiresAt = windowExpiresAt,
                PointsStatus = PointsStatus.Pending
            };

            await _sessionRepository.AddAsync(session, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new StartSessionResponseDto
            {
                SessionId = session.SessionId,
                BinId = session.BinId,
                BinName = $"Bin#{session.BinId:D3}",
                Status = session.Status,
                WindowExpiresAt = windowExpiresAt,
                CountdownSeconds = RollingWindowSeconds,
                TotalPoints = 0,
                Items = new List<SessionItemDto>()
            };
        }

        public async Task<SessionStatusResponseDto> GetSessionStatusAsync(
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

            var dto = await _sessionRepository.GetSessionStatusDtoAsync(sessionId, cancellationToken);
            if (dto == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Disposal session not found.");
            }

            return dto;
        }

        public async Task<EndSessionResponseDto> EndSessionAsync(
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

            var session = await _sessionRepository.GetByIdWithItemsAsync(sessionId, cancellationToken);

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

            if (!string.Equals(session.Status, SessionStatus.Active, StringComparison.Ordinal))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "SESSION_NOT_ACTIVE",
                    "The session has already ended.");
            }

            var sessionItems = session.Items.Select(i => new SessionItemDto
            {
                ItemId = i.ItemId,
                WasteType = i.WasteType != null ? i.WasteType.Name : string.Empty,
                EstimatedPoints = i.EstimatedPoints
            }).ToList();

            var now = DateTime.UtcNow;
            DisposalSurvey survey;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var terminated = await _sessionRepository.TerminateSessionIfActiveAsync(sessionId, now, cancellationToken);
                if (!terminated)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "SESSION_NOT_ACTIVE",
                        "The session has already ended.");
                }

                survey = await _surveyRepository.EnsureSurveyCreatedAsync(sessionId, now, cancellationToken);
                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            await _realtimeNotifier.NotifySessionEndedAsync(
                sessionId,
                SessionStatus.Terminated,
                SessionTerminationReason.Manual,
                survey.SurveyId,
                cancellationToken);

            return new EndSessionResponseDto
            {
                SessionId = sessionId,
                BinId = session.BinId,
                BinName = $"Bin#{session.BinId:D3}",
                Status = SessionStatus.Terminated,
                TerminationReason = SessionTerminationReason.Manual,
                CountdownSeconds = 0,
                TotalPoints = sessionItems.Sum(i => i.EstimatedPoints),
                Items = sessionItems
            };
        }

        public async Task<int> ProcessExpiredSessionsAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var expiredSessionIds = await _sessionRepository.GetExpiredActiveSessionIdsAsync(now, cancellationToken);

            int processedCount = 0;

            foreach (var sessionId in expiredSessionIds)
            {
                try
                {
                    DisposalSurvey? survey = null;
                    bool transitioned = false;

                    await _unitOfWork.BeginTransactionAsync(cancellationToken);
                    try
                    {
                        var transitionTime = DateTime.UtcNow;
                        var terminated = await _sessionRepository.TerminateSessionIfActiveAsync(sessionId, transitionTime, cancellationToken);

                        if (!terminated)
                        {
                            await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                            continue;
                        }

                        survey = await _surveyRepository.EnsureSurveyCreatedAsync(sessionId, transitionTime, cancellationToken);
                        await _unitOfWork.CommitTransactionAsync(cancellationToken);
                        transitioned = true;
                    }
                    catch
                    {
                        await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                        throw;
                    }

                    if (transitioned && survey != null)
                    {
                        processedCount++;
                        await _realtimeNotifier.NotifySessionEndedAsync(
                            sessionId,
                            SessionStatus.Terminated,
                            SessionTerminationReason.Timeout,
                            survey.SurveyId,
                            cancellationToken);
                    }
                }
                catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Failed to process timeout for session {SessionId}.", sessionId);
                }
            }

            return processedCount;
        }
    }
}
