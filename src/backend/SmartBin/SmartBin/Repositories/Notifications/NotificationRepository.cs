using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;

namespace SmartBin.Repositories.Notifications
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly AppDbContext _context;

        public NotificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Notification notification, CancellationToken cancellationToken = default)
        {
            await _context.Notifications.AddAsync(notification, cancellationToken);
        }

        public async Task<List<int>> GetUserIdsByRoleAsync(string roleName, CancellationToken cancellationToken = default)
        {
            return await (from ur in _context.UserRoles.AsNoTracking()
                          join r in _context.Roles.AsNoTracking() on ur.RoleId equals r.Id
                          where r.Name == roleName
                          select ur.UserId)
                .ToListAsync(cancellationToken);
        }
    }
}