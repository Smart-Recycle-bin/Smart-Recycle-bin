using SmartBin.Dtos.Common;
using SmartBin.DTOs.Notifications;

namespace SmartBin.Services.Notifications
{
    public interface IAdminNotificationService
    {
        Task PublishToAdminsAsync(
            string title,
            string? message,
            string type,
            string sourceType,
            string? sourceReferenceId,
            CancellationToken cancellationToken = default);

        Task PublishToAdminAsync(
            int targetAdminId,
            string title,
            string? message,
            string type,
            string sourceType,
            string? sourceReferenceId,
            CancellationToken cancellationToken = default);

        Task<(AdminNotificationsFeedDto Feed, PaginationMetaDto Meta)> GetNotificationsForAdminAsync(
            int currentAdminId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<MarkNotificationReadResponseDto> MarkAsReadAsync(
            int notificationId,
            int currentAdminId,
            CancellationToken cancellationToken = default);

        Task<MarkAllNotificationsReadResponseDto> MarkAllAsReadAsync(
            int currentAdminId,
            CancellationToken cancellationToken = default);
    }
}
