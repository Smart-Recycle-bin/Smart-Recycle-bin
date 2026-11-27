using SmartBin.Common;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Notifications;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Notifications;

namespace SmartBin.Services.Notifications
{
    public class AdminNotificationService : IAdminNotificationService
    {
        private const int MaxTitleLength = 150;
        private const int MaxMessageLength = 500;
        private const int MaxSourceRefLength = 64;

        private readonly IAdminNotificationRepository _notificationRepository;
        private readonly IUnitOfWork _unitOfWork;

        public AdminNotificationService(
            IAdminNotificationRepository notificationRepository,
            IUnitOfWork unitOfWork)
        {
            _notificationRepository = notificationRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task PublishToAdminsAsync(
            string title,
            string? message,
            string type,
            string sourceType,
            string? sourceReferenceId,
            CancellationToken cancellationToken = default)
        {
            var adminIds = await _notificationRepository.GetActiveAdminIdsAsync(cancellationToken);
            if (adminIds.Count == 0)
            {
                return;
            }

            var now = DateTime.UtcNow;
            var normalizedType = NormalizeType(type);
            var cleanTitle = TruncateRequired(title, MaxTitleLength, nameof(title));
            var cleanMessage = TruncateOptional(message, MaxMessageLength);
            var cleanSourceType = TruncateRequired(sourceType, 50, nameof(sourceType)).ToUpperInvariant();
            var cleanSourceRef = TruncateOptional(sourceReferenceId, MaxSourceRefLength);

            var entries = adminIds.Select(adminId => new AdminNotification
            {
                TargetAdminId = adminId,
                Audience = AdminNotificationAudiences.SysAdminBroadcast,
                Title = cleanTitle,
                Message = cleanMessage,
                Type = normalizedType,
                SourceType = cleanSourceType,
                SourceReferenceId = cleanSourceRef,
                IsRead = false,
                CreatedAt = now
            });

            await _notificationRepository.AddRangeAsync(entries, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        public async Task PublishToAdminAsync(
            int targetAdminId,
            string title,
            string? message,
            string type,
            string sourceType,
            string? sourceReferenceId,
            CancellationToken cancellationToken = default)
        {
            if (targetAdminId <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(targetAdminId), "Target admin ID must be positive.");
            }

            var entry = new AdminNotification
            {
                TargetAdminId = targetAdminId,
                Audience = AdminNotificationAudiences.DirectAdmin,
                Title = TruncateRequired(title, MaxTitleLength, nameof(title)),
                Message = TruncateOptional(message, MaxMessageLength),
                Type = NormalizeType(type),
                SourceType = TruncateRequired(sourceType, 50, nameof(sourceType)).ToUpperInvariant(),
                SourceReferenceId = TruncateOptional(sourceReferenceId, MaxSourceRefLength),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };

            await _notificationRepository.AddRangeAsync(new[] { entry }, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        public async Task<(AdminNotificationsFeedDto Feed, PaginationMetaDto Meta)> GetNotificationsForAdminAsync(
            int currentAdminId,
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

            var (items, totalItems, unreadCount) = await _notificationRepository.GetFeedForAdminAsync(
                currentAdminId,
                page,
                pageSize,
                cancellationToken);

            var feed = new AdminNotificationsFeedDto
            {
                Items = items,
                UnreadCount = unreadCount
            };

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalItems == 0 ? 0 : (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (feed, meta);
        }

        public async Task<MarkNotificationReadResponseDto> MarkAsReadAsync(
            int notificationId,
            int currentAdminId,
            CancellationToken cancellationToken = default)
        {
            if (notificationId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "notificationId must be a positive integer.",
                    new[] { new { field = "id", message = "id must be a positive integer." } });
            }

            var updated = await _notificationRepository.MarkAsReadIfOwnedAsync(
                notificationId,
                currentAdminId,
                DateTime.UtcNow,
                cancellationToken);

            if (!updated)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Notification not found.");
            }

            return new MarkNotificationReadResponseDto
            {
                Id = notificationId,
                Unread = false
            };
        }

        public async Task<MarkAllNotificationsReadResponseDto> MarkAllAsReadAsync(
            int currentAdminId,
            CancellationToken cancellationToken = default)
        {
            var remainingUnread = await _notificationRepository.MarkAllAsReadForAdminAsync(
                currentAdminId,
                DateTime.UtcNow,
                cancellationToken);

            return new MarkAllNotificationsReadResponseDto
            {
                UnreadCount = remainingUnread
            };
        }

        private static string NormalizeType(string type)
        {
            var normalized = type?.Trim().ToLowerInvariant() ?? string.Empty;
            if (!AdminNotificationTypes.All.Contains(normalized))
            {
                throw new ArgumentException($"Unsupported notification type '{type}'.", nameof(type));
            }

            return normalized;
        }

        private static string TruncateRequired(string value, int maxLength, string paramName)
        {
            var trimmed = value?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                throw new ArgumentException("Value cannot be empty.", paramName);
            }

            return trimmed.Length <= maxLength ? trimmed : trimmed.Substring(0, maxLength);
        }

        private static string? TruncateOptional(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var trimmed = value.Trim();
            return trimmed.Length <= maxLength ? trimmed : trimmed.Substring(0, maxLength);
        }
    }
}
