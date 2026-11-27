using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Notifications;
using SmartBin.Models;

namespace SmartBin.Repositories.Notifications
{
    public class AdminNotificationRepository : IAdminNotificationRepository
    {
        private const string AdminRoleName = "SYS_ADMIN";

        private readonly AppDbContext _context;

        public AdminNotificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<int>> GetActiveAdminIdsAsync(CancellationToken cancellationToken = default)
        {
            var adminRoleId = await _context.Roles
                .AsNoTracking()
                .Where(r => r.Name == AdminRoleName)
                .Select(r => (int?)r.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (!adminRoleId.HasValue)
            {
                return new List<int>();
            }

            return await (
                from u in _context.Users.AsNoTracking()
                join ur in _context.UserRoles.AsNoTracking() on u.Id equals ur.UserId
                where ur.RoleId == adminRoleId.Value &&
                      u.AccountStatus.ToLower() == "active"
                orderby u.Id
                select u.Id)
                .Distinct()
                .ToListAsync(cancellationToken);
        }

        public async Task AddRangeAsync(IEnumerable<AdminNotification> notifications, CancellationToken cancellationToken = default)
        {
            await _context.AdminNotifications.AddRangeAsync(notifications, cancellationToken);
        }

        public async Task<(List<AdminNotificationItemDto> Items, int TotalItems, int UnreadCount)> GetFeedForAdminAsync(
            int targetAdminId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var baseQuery = _context.AdminNotifications
                .AsNoTracking()
                .Where(n => n.TargetAdminId == targetAdminId);

            var totalItems = await baseQuery.CountAsync(cancellationToken);
            var unreadCount = await baseQuery.CountAsync(n => !n.IsRead, cancellationToken);

            var rows = await baseQuery
                .OrderByDescending(n => n.CreatedAt)
                .ThenByDescending(n => n.NotificationId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new
                {
                    n.NotificationId,
                    n.Title,
                    n.Message,
                    n.CreatedAt,
                    n.IsRead,
                    n.Type,
                    n.SourceType,
                    n.SourceReferenceId
                })
                .ToListAsync(cancellationToken);

            var items = rows.Select(r => new AdminNotificationItemDto
            {
                Id = r.NotificationId,
                Title = r.Title,
                Message = r.Message,
                Time = EnsureUtc(r.CreatedAt),
                Unread = !r.IsRead,
                Type = r.Type,
                SourceType = r.SourceType,
                SourceReferenceId = r.SourceReferenceId
            }).ToList();

            return (items, totalItems, unreadCount);
        }

        public async Task<bool> MarkAsReadIfOwnedAsync(
            int notificationId,
            int targetAdminId,
            DateTime readAtUtc,
            CancellationToken cancellationToken = default)
        {
            var notification = await _context.AdminNotifications
                .FirstOrDefaultAsync(
                    n => n.NotificationId == notificationId && n.TargetAdminId == targetAdminId,
                    cancellationToken);

            if (notification == null)
            {
                return false;
            }

            if (!notification.IsRead)
            {
                notification.IsRead = true;
                notification.ReadAt = readAtUtc;
                await _context.SaveChangesAsync(cancellationToken);
            }

            return true;
        }

        public async Task<int> MarkAllAsReadForAdminAsync(
            int targetAdminId,
            DateTime readAtUtc,
            CancellationToken cancellationToken = default)
        {
            await _context.AdminNotifications
                .Where(n => n.TargetAdminId == targetAdminId && !n.IsRead)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(n => n.IsRead, true)
                    .SetProperty(n => n.ReadAt, readAtUtc),
                    cancellationToken);

            return await _context.AdminNotifications
                .AsNoTracking()
                .CountAsync(n => n.TargetAdminId == targetAdminId && !n.IsRead, cancellationToken);
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
