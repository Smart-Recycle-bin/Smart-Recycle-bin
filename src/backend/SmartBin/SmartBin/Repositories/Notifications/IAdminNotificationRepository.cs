using SmartBin.DTOs.Notifications;
using SmartBin.Models;

namespace SmartBin.Repositories.Notifications
{
    public interface IAdminNotificationRepository
    {
        Task<List<int>> GetActiveAdminIdsAsync(CancellationToken cancellationToken = default);

        Task AddRangeAsync(IEnumerable<AdminNotification> notifications, CancellationToken cancellationToken = default);

        Task<(List<AdminNotificationItemDto> Items, int TotalItems, int UnreadCount)> GetFeedForAdminAsync(
            int targetAdminId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<bool> MarkAsReadIfOwnedAsync(
            int notificationId,
            int targetAdminId,
            DateTime readAtUtc,
            CancellationToken cancellationToken = default);

        Task<int> MarkAllAsReadForAdminAsync(
            int targetAdminId,
            DateTime readAtUtc,
            CancellationToken cancellationToken = default);
    }
}
