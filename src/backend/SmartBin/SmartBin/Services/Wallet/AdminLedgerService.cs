using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Wallet;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Wallet;
using SmartBin.Services.Audit;

namespace SmartBin.Services.Wallets
{
    public class AdminLedgerService : IAdminLedgerService
    {
        private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            LedgerTransactionType.Credit,
            LedgerTransactionType.Debit
        };

        private static readonly HashSet<string> AllowedSources = new(StringComparer.OrdinalIgnoreCase)
        {
            "session_confirm",
            LedgerSource.SessionAward,
            LedgerSource.VoucherRedemption,
            "reward_redemption",
            LedgerSource.ManualAdjustment
        };

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "transactionId",
            "timestamp",
            "createdAt",
            "userName",
            "pointsDelta",
            "runningBalance",
            "source",
            "entryType",
            "type"
        };

        private static readonly HashSet<string> ForbiddenActorProperties = new(StringComparer.OrdinalIgnoreCase)
        {
            "adminId",
            "actorId",
            "actorAdminId",
            "createdByAdminId",
            "performedByAdminId"
        };

        private readonly IAdminLedgerRepository _adminLedgerRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly IUnitOfWork _unitOfWork;

        public AdminLedgerService(
            IAdminLedgerRepository adminLedgerRepository,
            IAuditLogService auditLogService,
            IUnitOfWork unitOfWork)
        {
            _adminLedgerRepository = adminLedgerRepository;
            _auditLogService = auditLogService;
            _unitOfWork = unitOfWork;
        }

        public async Task<(List<AdminLedgerRowDto> Items, PaginationMetaDto Meta)> GetAdminLedgerAsync(
            int? userId,
            string? from,
            string? to,
            string? type,
            string? source,
            string? search,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            if (userId.HasValue && userId.Value <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid userId filter.",
                    new[] { new { field = "userId", message = "userId must be a positive integer." } });
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

            var (fromUtc, toBoundUtc, toExclusive) = ParseDateRange(from, to);

            string? normalizedType = null;
            if (!string.IsNullOrWhiteSpace(type))
            {
                normalizedType = type.Trim().ToLowerInvariant();
                if (!AllowedTypes.Contains(normalizedType))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid type filter.",
                        new[] { new { field = "type", message = "Must be credit or debit." } });
                }
            }

            string? normalizedSource = null;
            if (!string.IsNullOrWhiteSpace(source))
            {
                normalizedSource = source.Trim().ToLowerInvariant();
                if (!AllowedSources.Contains(normalizedSource))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid source filter.",
                        new[] { new { field = "source", message = "Must be session_confirm, voucher_redemption, or manual_adjustment." } });
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
                                message = "Must be one of transactionId, timestamp, createdAt, userName, pointsDelta, runningBalance, source, entryType."
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

            var (items, totalItems) = await _adminLedgerRepository.GetAdminLedgerPagedAsync(
                userId,
                fromUtc,
                toBoundUtc,
                toExclusive,
                normalizedType,
                normalizedSource,
                search,
                page,
                pageSize,
                normalizedSortBy,
                normalizedSortDir,
                cancellationToken);

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (items, meta);
        }

        public async Task<(ManualAdjustmentResponseDto Response, bool IsReplay)> ApplyManualAdjustmentAsync(
            int actorAdminId,
            string? idempotencyKey,
            ManualAdjustmentRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (request == null)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Request body is required.");
            }

            if (request.AdditionalProperties != null &&
                request.AdditionalProperties.Keys.Any(k => ForbiddenActorProperties.Contains(k)))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Client-supplied actor or admin IDs are not accepted.",
                    new[] { new { field = "adminId", message = "Actor identity is derived from the authenticated token." } });
            }

            var trimmedKey = idempotencyKey?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmedKey))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Idempotency-Key header is required.",
                    new[] { new { field = "Idempotency-Key", message = "Idempotency-Key header is required." } });
            }

            if (trimmedKey.Length > 128)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Idempotency-Key header cannot exceed 128 characters.",
                    new[] { new { field = "Idempotency-Key", message = "Idempotency-Key cannot exceed 128 characters." } });
            }

            if (!request.UserId.HasValue || request.UserId.Value <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid userId.",
                    new[] { new { field = "userId", message = "userId must be a positive integer." } });
            }

            if (!request.Amount.HasValue || request.Amount.Value <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid adjustment amount.",
                    new[] { new { field = "amount", message = "amount must be a positive integer." } });
            }

            var normalizedType = request.Type?.Trim().ToLowerInvariant() ?? string.Empty;
            if (!AllowedTypes.Contains(normalizedType))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid adjustment type.",
                    new[] { new { field = "type", message = "Must be credit or debit." } });
            }

            var trimmedReasonCode = request.ReasonCode?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmedReasonCode))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reasonCode is required.",
                    new[] { new { field = "reasonCode", message = "reasonCode is required." } });
            }

            if (trimmedReasonCode.Length > 100)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reasonCode cannot exceed 100 characters.",
                    new[] { new { field = "reasonCode", message = "reasonCode cannot exceed 100 characters." } });
            }

            var trimmedReasonNote = request.ReasonNote?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmedReasonNote))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reasonNote is required.",
                    new[] { new { field = "reasonNote", message = "reasonNote is required." } });
            }

            if (trimmedReasonNote.Length > 500)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "reasonNote cannot exceed 500 characters.",
                    new[] { new { field = "reasonNote", message = "reasonNote cannot exceed 500 characters." } });
            }

            var targetUserId = request.UserId.Value;
            var amount = request.Amount.Value;
            var requestHash = ComputeRequestHash(targetUserId, amount, normalizedType, trimmedReasonCode, trimmedReasonNote);

            var existingIdempotency = await _adminLedgerRepository.GetIdempotencyRecordAsync(trimmedKey, cancellationToken);
            if (existingIdempotency != null)
            {
                return (ResolveIdempotencyHit(existingIdempotency, requestHash), true);
            }

            var userExists = await _adminLedgerRepository.UserExistsAsync(targetUserId, cancellationToken);
            if (!userExists)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "User account not found.");
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var response = await _adminLedgerRepository.ExecuteAdjustmentAtomicAsync(
                    targetUserId,
                    amount,
                    normalizedType,
                    trimmedReasonCode,
                    trimmedReasonNote,
                    actorAdminId,
                    trimmedKey,
                    requestHash,
                    DateTime.UtcNow,
                    cancellationToken);

                var signedDelta = response.PointsDelta >= 0
                    ? $"+{response.PointsDelta.ToString(CultureInfo.InvariantCulture)}"
                    : response.PointsDelta.ToString(CultureInfo.InvariantCulture);

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.LedgerAdjustment,
                    AuditResourceTypes.Wallet,
                    targetUserId.ToString(CultureInfo.InvariantCulture),
                    $"{trimmedReasonCode}: {trimmedReasonNote} (tx #{response.TransactionId}, {signedDelta} pts)",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
                return (response, false);
            }
            catch (DbUpdateException)
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);

                var concurrentRecord = await _adminLedgerRepository.GetIdempotencyRecordAsync(trimmedKey, cancellationToken);
                if (concurrentRecord != null)
                {
                    return (ResolveIdempotencyHit(concurrentRecord, requestHash), true);
                }

                throw;
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }
        }

        private static ManualAdjustmentResponseDto ResolveIdempotencyHit(
            LedgerAdjustmentIdempotencyRecord record,
            string requestHash)
        {
            if (!string.Equals(record.RequestHash, requestHash, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "IDEMPOTENCY_KEY_REUSED",
                    "This Idempotency-Key was already used with a different payload.");
            }

            return new ManualAdjustmentResponseDto
            {
                TransactionId = record.TransactionId,
                UserId = record.TargetUserId,
                PointsDelta = record.PointsDelta,
                BalanceAfter = record.RunningBalance
            };
        }

        private static string ComputeRequestHash(
            int userId,
            int amount,
            string type,
            string reasonCode,
            string reasonNote)
        {
            var canonical = $"{userId}|{amount}|{type}|{reasonCode}|{reasonNote}";
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(canonical));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }

        private static (DateTime? FromUtc, DateTime? ToBoundUtc, bool ToExclusive) ParseDateRange(string? from, string? to)
        {
            DateTime? fromUtc = null;
            DateTime? toCompareUtc = null;
            DateTime? toBoundUtc = null;
            bool toExclusive = false;

            if (!string.IsNullOrWhiteSpace(from))
            {
                if (!TryParseUtcQueryDate(from, isUpperBound: false, out var parsedFrom, out _, out _))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid date range.",
                        new[] { new { field = "from", message = "Must be a valid ISO date (YYYY-MM-DD) or timestamp." } });
                }

                fromUtc = parsedFrom;
            }

            if (!string.IsNullOrWhiteSpace(to))
            {
                if (!TryParseUtcQueryDate(to, isUpperBound: true, out var parsedToBound, out var parsedToCompare, out var exclusive))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid date range.",
                        new[] { new { field = "to", message = "Must be a valid ISO date (YYYY-MM-DD) or timestamp." } });
                }

                toBoundUtc = parsedToBound;
                toCompareUtc = parsedToCompare;
                toExclusive = exclusive;
            }

            if (fromUtc.HasValue && toCompareUtc.HasValue && fromUtc.Value > toCompareUtc.Value)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid date range.",
                    new[] { new { field = "from", message = "Must be before 'to'." } });
            }

            return (fromUtc, toBoundUtc, toExclusive);
        }

        private static bool TryParseUtcQueryDate(
            string rawValue,
            bool isUpperBound,
            out DateTime boundUtc,
            out DateTime comparableStartUtc,
            out bool isExclusive)
        {
            var trimmed = rawValue.Trim();

            if (DateOnly.TryParseExact(trimmed, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateOnly))
            {
                var dayStartUtc = DateTime.SpecifyKind(dateOnly.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);
                comparableStartUtc = dayStartUtc;
                if (isUpperBound)
                {
                    boundUtc = dayStartUtc.AddDays(1);
                    isExclusive = true;
                }
                else
                {
                    boundUtc = dayStartUtc;
                    isExclusive = false;
                }
                return true;
            }

            if (DateTimeOffset.TryParse(
                trimmed,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var dto))
            {
                var utc = DateTime.SpecifyKind(dto.UtcDateTime, DateTimeKind.Utc);
                comparableStartUtc = utc;
                boundUtc = utc;
                isExclusive = false;
                return true;
            }

            boundUtc = default;
            comparableStartUtc = default;
            isExclusive = false;
            return false;
        }
    }
}
