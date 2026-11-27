using System.Globalization;
using SmartBin.Common;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Audit;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Audit;

namespace SmartBin.Services.Audit
{
    public class AuditLogService : IAuditLogService
    {
        private const int MaxJustificationLength = 1000;
        private const int MaxResourceIdLength = 64;
        private const int MaxAdminNameLength = 150;
        private const int MaxIpAddressLength = 64;

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "auditId",
            "timestamp",
            "createdAt",
            "adminName",
            "actionType",
            "resourceType",
            "resourceId",
            "ipAddress"
        };

        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuditLogService(
            IAuditLogRepository auditLogRepository,
            IUnitOfWork unitOfWork,
            IHttpContextAccessor httpContextAccessor)
        {
            _auditLogRepository = auditLogRepository;
            _unitOfWork = unitOfWork;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task RecordAsync(
            int actorAdminId,
            string actionType,
            string resourceType,
            string resourceId,
            string justification,
            CancellationToken cancellationToken = default)
        {
            if (actorAdminId <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(actorAdminId), "Actor admin ID must be positive.");
            }

            var normalizedAction = actionType?.Trim().ToUpperInvariant() ?? string.Empty;
            if (!AuditActionTypes.All.Contains(normalizedAction))
            {
                throw new ArgumentException($"Unsupported audit action type '{actionType}'.", nameof(actionType));
            }

            var normalizedResourceType = resourceType?.Trim().ToUpperInvariant() ?? string.Empty;
            if (!AuditResourceTypes.All.Contains(normalizedResourceType))
            {
                throw new ArgumentException($"Unsupported audit resource type '{resourceType}'.", nameof(resourceType));
            }

            var cleanResourceId = Truncate(resourceId?.Trim(), MaxResourceIdLength);
            if (string.IsNullOrWhiteSpace(cleanResourceId))
            {
                throw new ArgumentException("Audit resource ID is required.", nameof(resourceId));
            }

            var cleanJustification = Truncate(justification?.Trim(), MaxJustificationLength);
            if (string.IsNullOrWhiteSpace(cleanJustification))
            {
                cleanJustification = normalizedAction;
            }

            var adminName = await _auditLogRepository.ResolveAdminDisplayNameAsync(actorAdminId, cancellationToken);
            if (string.IsNullOrWhiteSpace(adminName))
            {
                var principal = _httpContextAccessor.HttpContext?.User;
                if (principal.TryGetUserId(out var claimAdminId) && claimAdminId == actorAdminId)
                {
                    adminName = principal.GetDisplayName();
                }
            }

            var finalAdminName = Truncate(
                string.IsNullOrWhiteSpace(adminName) ? $"Admin #{actorAdminId}" : adminName,
                MaxAdminNameLength);

            var entry = new AuditLog
            {
                AdminId = actorAdminId,
                AdminName = finalAdminName,
                ActionType = normalizedAction,
                ResourceType = normalizedResourceType,
                ResourceId = cleanResourceId,
                Justification = cleanJustification,
                IpAddress = ResolveTrustedClientIp(),
                CreatedAt = DateTime.UtcNow
            };

            await _auditLogRepository.AddAsync(entry, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        public async Task<(List<AdminAuditLogItemDto> Items, PaginationMetaDto Meta)> GetAuditLogsAsync(
            int? adminId,
            string? actionType,
            string? resourceType,
            string? resourceId,
            string? from,
            string? to,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            if (adminId.HasValue && adminId.Value <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid adminId filter.",
                    new[] { new { field = "adminId", message = "adminId must be a positive integer." } });
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

            string? normalizedAction = null;
            if (!string.IsNullOrWhiteSpace(actionType))
            {
                normalizedAction = actionType.Trim().ToUpperInvariant();
                if (!AuditActionTypes.All.Contains(normalizedAction))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid actionType filter.",
                        new[] { new { field = "actionType", message = "Unsupported actionType value." } });
                }
            }

            string? normalizedResourceType = null;
            if (!string.IsNullOrWhiteSpace(resourceType))
            {
                normalizedResourceType = resourceType.Trim().ToUpperInvariant();
                if (!AuditResourceTypes.All.Contains(normalizedResourceType))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid resourceType filter.",
                        new[] { new { field = "resourceType", message = "Unsupported resourceType value." } });
                }
            }

            string? trimmedResourceId = string.IsNullOrWhiteSpace(resourceId) ? null : resourceId.Trim();
            if (trimmedResourceId != null && trimmedResourceId.Length > MaxResourceIdLength)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid resourceId filter.",
                    new[] { new { field = "resourceId", message = "resourceId cannot exceed 64 characters." } });
            }

            var (fromUtc, toBoundUtc, toExclusive) = ParseDateRange(from, to);

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
                                message = "Must be one of auditId, timestamp, createdAt, adminName, actionType, resourceType, resourceId, ipAddress."
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

            var (items, totalItems) = await _auditLogRepository.GetAuditLogsPagedAsync(
                adminId,
                normalizedAction,
                normalizedResourceType,
                trimmedResourceId,
                fromUtc,
                toBoundUtc,
                toExclusive,
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

        private string ResolveTrustedClientIp()
        {
            var remoteIp = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (remoteIp == null)
            {
                return "unavailable";
            }

            if (remoteIp.IsIPv4MappedToIPv6)
            {
                remoteIp = remoteIp.MapToIPv4();
            }

            return Truncate(remoteIp.ToString(), MaxIpAddressLength);
        }

        private static string Truncate(string? value, int maxLength)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value.Length <= maxLength ? value : value.Substring(0, maxLength);
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
