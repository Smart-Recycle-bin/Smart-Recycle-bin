using SmartBin.Dtos.Common;
using SmartBin.DTOs.Users;

namespace SmartBin.Services.Users
{
    public interface IAdminUserService
    {
        Task<(List<AdminRecyclerDto> Items, PaginationMetaDto Meta)> GetRecyclersAsync(
            string? role,
            string? search,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);

        Task<SuspendUserResponseDto> SuspendRecyclerAsync(
            int userId,
            int actorAdminId,
            SuspendUserRequestDto request,
            CancellationToken cancellationToken = default);

        Task<UnsuspendUserResponseDto> UnsuspendRecyclerAsync(
            int userId,
            int actorAdminId,
            UnsuspendUserRequestDto? request,
            CancellationToken cancellationToken = default);
    }
}
