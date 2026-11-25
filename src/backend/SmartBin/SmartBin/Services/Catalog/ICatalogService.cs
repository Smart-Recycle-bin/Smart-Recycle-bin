using SmartBin.DTOs;
using SmartBin.DTOs.Common;

namespace SmartBin.Services
{
    public interface ICatalogService
    {
        Task<(List<CatalogCardDto> Items, PaginationMeta Meta)> BrowseAsync(
            int userId,
            int? categoryId,
            bool affordableOnly,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<CatalogDetailDto> GetDetailAsync(
            int itemId,
            CancellationToken cancellationToken = default);
    }
}