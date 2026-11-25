using SmartBin.Common;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Inspections;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;
using SmartBin.Repositories.Inspections;
using SmartBin.Services.Audit;
using SmartBin.Services.Surveys;

namespace SmartBin.Services.Inspections
{
    public class InspectionService : IInspectionService
    {
        private readonly IInspectionRepository _inspectionRepository;
        private readonly IBinRepository _binRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly ISurveyService _surveyService;
        private readonly IUnitOfWork _unitOfWork;

        public InspectionService(
            IInspectionRepository inspectionRepository,
            IBinRepository binRepository,
            IAuditLogService auditLogService,
            ISurveyService surveyService,
            IUnitOfWork unitOfWork)
        {
            _inspectionRepository = inspectionRepository;
            _binRepository = binRepository;
            _auditLogService = auditLogService;
            _surveyService = surveyService;
            _unitOfWork = unitOfWork;
        }

        public async Task<(List<InspectionListItemDto> Items, InspectionSummaryDto Summary, PaginationMeta Meta)> ListAsync(
            string? status,
            string? search,
            string? sortBy,
            string? sortDir,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
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

            string? normalizedStatus = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                normalizedStatus = status.Trim().ToLowerInvariant();
                if (!InspectionReviewDecision.All.Contains(normalizedStatus))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid status filter.",
                        new[] { new { field = "status", message = "Must be one of: pending, approved, rejected." } });
                }
            }

            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                var normalizedSortBy = sortBy.Trim().ToLowerInvariant();
                if (normalizedSortBy is not ("createdat" or "mlconfidence"))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid sortBy value.",
                        new[] { new { field = "sortBy", message = "Must be createdAt or mlConfidence." } });
                }
            }

            if (!string.IsNullOrWhiteSpace(sortDir))
            {
                var normalizedSortDir = sortDir.Trim().ToLowerInvariant();
                if (normalizedSortDir is not ("asc" or "desc"))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid sortDir value.",
                        new[] { new { field = "sortDir", message = "Must be asc or desc." } });
                }
            }

            var (items, totalItems) = await _inspectionRepository.ListPagedAsync(
                normalizedStatus,
                search,
                sortBy,
                sortDir,
                page,
                pageSize,
                cancellationToken);

            var summary = await _inspectionRepository.GetSummaryAsync(cancellationToken);

            var meta = new PaginationMeta
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (items, summary, meta);
        }

        public async Task<InspectionDetailDto> GetAsync(
            int reportId,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid reportId.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            return await _inspectionRepository.GetDetailAsync(reportId, cancellationToken)
                ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND", "Inspection report not found.");
        }

        public async Task<ResolveInspectionResultDto> CorrectAsync(
            int adminId,
            int reportId,
            string? wasteTypeName,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid reportId.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            var name = wasteTypeName?.Trim().ToUpperInvariant();
            if (string.IsNullOrEmpty(name) || !WasteTypeNames.All.Contains(name))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid wasteTypeId.",
                    new[] { new { field = "wasteTypeId", message = "Must be one of: PLASTIC, METAL, PAPER, ORGANIC, TRASH." } });
            }

            var wasteType = await _binRepository.GetWasteTypeByNameAsync(name, cancellationToken)
                ?? throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Waste type does not exist.",
                    new[] { new { field = "wasteTypeId", message = "Waste type does not exist." } });

            return await ResolveAsync(
                adminId,
                reportId,
                InspectionReviewDecision.Approved,
                wasteType,
                "INSPECTION_CORRECT",
                cancellationToken);
        }

        public Task<ResolveInspectionResultDto> DismissAsync(
            int adminId,
            int reportId,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid reportId.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            return ResolveAsync(
                adminId,
                reportId,
                InspectionReviewDecision.Rejected,
                null,
                "INSPECTION_DISMISS",
                cancellationToken);
        }

        public async Task<RetrainResultDto> RetrainAsync(
            int adminId,
            int reportId,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid reportId.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var report = await _inspectionRepository.GetByIdAsync(reportId, cancellationToken)
                    ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND", "Inspection report not found.");

                if (report.ReviewDecision == InspectionReviewDecision.Pending)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "REVIEW_REQUIRED",
                        "Review the report before sending it for retraining.");
                }

                if (report.RetrainingStatus is RetrainingStatus.Queued or RetrainingStatus.Sent)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "CONFLICT",
                        "This report is already queued or sent for retraining.");
                }

                report.RetrainingStatus = RetrainingStatus.Queued;
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await _auditLogService.LogAsync(
                    adminId,
                    "INSPECTION_RETRAIN",
                    "INSPECTION_REPORT",
                    reportId,
                    null,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);

                return new RetrainResultDto
                {
                    ReportId = reportId,
                    RetrainingStatus = report.RetrainingStatus
                };
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        private async Task<ResolveInspectionResultDto> ResolveAsync(
            int adminId,
            int reportId,
            string decision,
            WasteType? corrected,
            string actionType,
            CancellationToken cancellationToken)
        {
            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var sessionId = await _inspectionRepository.GetSessionIdByReportIdAsync(reportId, cancellationToken)
                    ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND", "Inspection report not found.");

                await _inspectionRepository.AcquireSessionLockAsync(sessionId, cancellationToken);

                var report = await _inspectionRepository.GetByIdAsync(reportId, cancellationToken)
                    ?? throw new ApiException(StatusCodes.Status404NotFound, "NOT_FOUND", "Inspection report not found.");

                if (report.ReviewDecision != InspectionReviewDecision.Pending)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "CONFLICT",
                        "This report has already been reviewed.");
                }

                report.ReviewDecision = decision;
                report.ReviewedAt = DateTime.UtcNow;
                report.ReviewedByAdminId = adminId;
                if (corrected != null)
                {
                    report.CorrectedWasteTypeId = corrected.WasteTypeId;
                }

                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await _auditLogService.LogAsync(
                    adminId,
                    actionType,
                    "INSPECTION_REPORT",
                    reportId,
                    null,
                    cancellationToken);

                var stillPending = await _inspectionRepository.HasPendingReportsForSessionAsync(sessionId, cancellationToken);

                ResolveInspectionResultDto result;
                if (stillPending)
                {
                    result = new ResolveInspectionResultDto
                    {
                        ReportId = reportId,
                        ReviewDecision = decision,
                        ConfirmedWasteType = corrected?.Name.ToUpperInvariant(),
                        SessionPointsFinalized = false,
                        PointsAwarded = null,
                        TransactionId = null
                    };
                }
                else
                {
                    await _surveyService.FinalizeSessionPointsAsync(sessionId, cancellationToken);

                    var (pointsAwarded, transactionId) = await _inspectionRepository.GetSessionFinalizationInfoAsync(
                        sessionId,
                        cancellationToken);

                    result = new ResolveInspectionResultDto
                    {
                        ReportId = reportId,
                        ReviewDecision = decision,
                        ConfirmedWasteType = corrected?.Name.ToUpperInvariant(),
                        SessionPointsFinalized = true,
                        PointsAwarded = pointsAwarded,
                        TransactionId = transactionId
                    };
                }

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
                return result;
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }
    }
}