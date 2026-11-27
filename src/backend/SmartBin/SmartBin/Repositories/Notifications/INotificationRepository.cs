using SmartBin.Models;

namespace SmartBin.Repositories.Notifications
{
    public interface INotificationRepository
    {
        Task AddAsync(Notification notification, CancellationToken cancellationToken = default);
        Task<List<int>> GetUserIdsByRoleAsync(string roleName, CancellationToken cancellationToken = default);
    }
}