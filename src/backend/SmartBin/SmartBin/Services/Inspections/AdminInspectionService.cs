using System.Globalization;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Inspections;
using SmartBin.Models.Constants;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Inspections;
using SmartBin.Services.Audit;
using SmartBin.Services.Surveys;

namespace SmartBin.Services.Inspections
{
    public class AdminInspectionService : IAdminInspectionService
    {
        private static readonly HashSet<string> AllowedStatuses = new(InspectionReportStatus.All, StringComparer.OrdinalIgnoreCase);

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "reportId",
            "sessionId",
            "binId",
            "mlPredictedWasteType",
            "mlConfidence",
            "date",
            "createdAt",
            "status"
        };

        private readonly IAdminInspectionRepository _inspectionRepository;
        private readonly ISurveyService _surveyService;
        private readonly IAuditLogService _auditLogService;
        private readonly IUnitOfWork _unitOfWork;

        public AdminInspectionService(
            IAdminInspectionRepository inspectionRepository,
            ISurveyService surveyService,
            IAuditLogService auditLogService,
            IUnitOfWork unitOfWork)
        {
            _inspectionRepository = inspectionRepository;
            _surveyService = surveyService;
            _auditLogService = auditLogService;
            _unitOfWork = unitOfWork;
        }

        public async Task<(List<AdminInspectionReportListItemDto> Items, PaginationMetaDto Meta)> GetReportsAsync(
            string? status,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
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
                if (!AllowedStatuses.Contains(normalizedStatus))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid status filter.",
                        new[] { new { field = "status", message = "Must be pending, reviewed, or sent_to_retraining." } });
                }
            }

            string? normalizedSortBy = null;
            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                normalizedSortBy = sortBy.Trim();
                if (!AllowedSortFields.Contains(normalizedSortBy))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid sortBy value.",
                        new[]
                        {
                            new
                            {
                                field = "sortBy",
                                message = "Must be one of reportId, sessionId, binId, mlPredictedWasteType, mlConfidence, date, createdAt, status."
                            }
                        });
                }
            }

            var normalizedSortDir = string.IsNullOrWhiteSpace(sortDir) ? "desc" : sortDir.Trim().ToLowerInvariant();
            if (normalizedSortDir != "asc" && normalizedSortDir != "desc")
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid sortDir value.",
                    new[] { new { field = "sortDir", message = "Must be asc or desc." } });
            }

            var (items, totalItems) = await _inspectionRepository.GetReportsPagedAsync(
                normalizedStatus,
                search,
                page,
                pageSize,
                normalizedSortBy,
                normalizedSortDir,
                cancellationToken);

            foreach (var item in items)
            {
                item.Date = EnsureUtc(item.Date);
            }

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (items, meta);
        }

        public Task<AdminInspectionSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
        {
            return _inspectionRepository.GetSummaryAsync(cancellationToken);
        }

        public async Task<AdminInspectionReportDetailDto> GetReportDetailAsync(
            int reportId,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reportId must be a positive integer.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            var detail = await _inspectionRepository.GetReportDetailAsync(reportId, cancellationToken);
            if (detail == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Inspection report not found.");
            }

            detail.Date = EnsureUtc(detail.Date);
            if (detail.ReviewedAt.HasValue)
            {
                detail.ReviewedAt = EnsureUtc(detail.ReviewedAt.Value);
            }

            return detail;
        }

        public Task<List<AdminWasteTypeOptionDto>> GetWasteTypesAsync(CancellationToken cancellationToken = default)
        {
            return _inspectionRepository.GetWasteTypesAsync(cancellationToken);
        }

        public async Task<CorrectInspectionReportResponseDto> CorrectReportAsync(
            int reportId,
            int actorAdminId,
            CorrectInspectionReportRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reportId must be a positive integer.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            if (!request.WasteTypeId.HasValue || request.WasteTypeId.Value <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "wasteTypeId is required.",
                    new[] { new { field = "wasteTypeId", message = "wasteTypeId must be a positive integer." } });
            }

            var justification = ValidateJustification(request.AdminJustification);

            var wasteType = await _inspectionRepository.GetWasteTypeByIdAsync(request.WasteTypeId.Value, cancellationToken);
            if (wasteType == null)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Unknown waste type.",
                    new[] { new { field = "wasteTypeId", message = "Selected waste type does not exist." } });
            }

            var report = await _inspectionRepository.GetReportStateAsync(reportId, cancellationToken);
            if (report == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Inspection report not found.");
            }

            if (!string.Equals(report.Status, InspectionReportStatus.Pending, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "This report has already been resolved.");
            }

            var now = DateTime.UtcNow;
            var pointsCredited = 0;
            int? transactionId = null;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var updated = await _inspectionRepository.TryResolvePendingReportAsync(
                    reportId,
                    InspectionReportStatus.Reviewed,
                    InspectionReviewDecision.Approved,
                    wasteType.WasteTypeId,
                    justification,
                    actorAdminId,
                    now,
                    cancellationToken);

                if (!updated)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "CONFLICT",
                        "This report has already been resolved.");
                }

                var preExistingLedger = await _inspectionRepository.GetSessionAwardLedgerAsync(report.SessionId, cancellationToken);

                // Finalize session points if all reports in this session are now resolved
                await _surveyService.FinalizeSessionPointsAsync(report.SessionId, cancellationToken);

                if (preExistingLedger == null)
                {
                    var createdLedger = await _inspectionRepository.GetSessionAwardLedgerAsync(report.SessionId, cancellationToken);
                    if (createdLedger != null)
                    {
                        pointsCredited = createdLedger.Value.PointsDelta;
                        transactionId = createdLedger.Value.TransactionId;
                    }
                }

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.InspectionCorrect,
                    AuditResourceTypes.InspectionReport,
                    report.ReportId.ToString(CultureInfo.InvariantCulture),
                    $"{justification} (corrected waste type: {wasteType.Name})",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new CorrectInspectionReportResponseDto
            {
                ReportId = report.ReportId,
                Status = InspectionReportStatus.Reviewed,
                ReviewDecision = InspectionReviewDecision.Approved,
                ConfirmedWasteType = wasteType.Name,
                PointsCredited = pointsCredited,
                TransactionId = transactionId,
                Message = $"Waste category corrected to {wasteType.Name}.",
                ResolvedAt = now
            };
        }

        public async Task<DismissInspectionReportResponseDto> DismissReportAsync(
            int reportId,
            int actorAdminId,
            DismissInspectionReportRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reportId must be a positive integer.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            var justification = ValidateJustification(request.AdminJustification);

            var report = await _inspectionRepository.GetReportStateAsync(reportId, cancellationToken);
            if (report == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Inspection report not found.");
            }

            if (!string.Equals(report.Status, InspectionReportStatus.Pending, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "This report has already been resolved.");
            }

            var now = DateTime.UtcNow;
            var pointsCredited = 0;
            int? transactionId = null;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var updated = await _inspectionRepository.TryResolvePendingReportAsync(
                    reportId,
                    InspectionReportStatus.Reviewed,
                    InspectionReviewDecision.Rejected,
                    null,
                    justification,
                    actorAdminId,
                    now,
                    cancellationToken);

                if (!updated)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "CONFLICT",
                        "This report has already been resolved.");
                }

                var preExistingLedger = await _inspectionRepository.GetSessionAwardLedgerAsync(report.SessionId, cancellationToken);

                // Finalize session points if all reports in this session are now resolved
                await _surveyService.FinalizeSessionPointsAsync(report.SessionId, cancellationToken);

                if (preExistingLedger == null)
                {
                    var createdLedger = await _inspectionRepository.GetSessionAwardLedgerAsync(report.SessionId, cancellationToken);
                    if (createdLedger != null)
                    {
                        pointsCredited = createdLedger.Value.PointsDelta;
                        transactionId = createdLedger.Value.TransactionId;
                    }
                }

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.InspectionDismiss,
                    AuditResourceTypes.InspectionReport,
                    report.ReportId.ToString(CultureInfo.InvariantCulture),
                    justification,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new DismissInspectionReportResponseDto
            {
                ReportId = report.ReportId,
                Status = InspectionReportStatus.Reviewed,
                ReviewDecision = InspectionReviewDecision.Rejected,
                PointsCredited = pointsCredited,
                TransactionId = transactionId,
                Message = "Report dismissed; original classification confirmed.",
                ResolvedAt = now
            };
        }

        public async Task<RetrainInspectionReportResponseDto> QueueReportForRetrainingAsync(
            int reportId,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            if (reportId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reportId must be a positive integer.",
                    new[] { new { field = "reportId", message = "reportId must be a positive integer." } });
            }

            var report = await _inspectionRepository.GetReportStateAsync(reportId, cancellationToken);
            if (report == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Inspection report not found.");
            }

            if (string.Equals(report.Status, InspectionReportStatus.Pending, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "REVIEW_REQUIRED",
                    "Resolve the report with correct or dismiss before queuing it for retraining.");
            }

            if (string.Equals(report.Status, InspectionReportStatus.SentToRetraining, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(report.RetrainingStatus, InspectionRetrainingStatus.Queued, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "This report is already queued for retraining.");
            }

            var now = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var queued = await _inspectionRepository.TryQueueReportForRetrainingAsync(
                    reportId,
                    actorAdminId,
                    now,
                    cancellationToken);

                if (!queued)
                {
                    throw new ApiException(
                        StatusCodes.Status409Conflict,
                        "CONFLICT",
                        "This report cannot be queued for retraining in its current state.");
                }

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.InspectionRetrain,
                    AuditResourceTypes.InspectionReport,
                    report.ReportId.ToString(CultureInfo.InvariantCulture),
                    "Queued resolved inspection report for local retraining (no external ML training worker connected).",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new RetrainInspectionReportResponseDto
            {
                ReportId = report.ReportId,
                Status = InspectionReportStatus.SentToRetraining,
                RetrainingStatus = InspectionRetrainingStatus.Queued,
                Message = "Report recorded in local retraining queue (no external ML training worker is connected).",
                ResolvedAt = now
            };
        }

        private static string ValidateJustification(string? rawJustification)
        {
            var trimmed = rawJustification?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "adminJustification is required.",
                    new[] { new { field = "adminJustification", message = "adminJustification is required." } });
            }

            return trimmed;
        }

        private static DateTime EnsureUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }
    }
}
