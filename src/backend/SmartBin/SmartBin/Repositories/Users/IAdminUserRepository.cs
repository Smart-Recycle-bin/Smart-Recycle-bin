using SmartBin.DTOs.Users;

namespace SmartBin.Repositories.Users
{
    public interface IAdminUserRepository
    {
        Task<(List<AdminRecyclerDto> Items, int TotalItems)> GetRecyclersPagedAsync(
            string? search,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
    }
}
