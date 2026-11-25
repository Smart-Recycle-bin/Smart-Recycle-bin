using SmartBin.Models;

namespace SmartBin.Repositories.Bins
{
    public interface IBinRepository
    {
        Task<Models.SmartBin?> GetByIdAsync(int binId, CancellationToken cancellationToken = default);
        Task<Models.SmartBin?> GetByIdWithCollectorAsync(int binId, CancellationToken cancellationToken = default);
        Task<List<Models.SmartBin>> GetAllForSpatialQueryAsync(CancellationToken cancellationToken = default);
        Task<(List<Models.SmartBin> Items, int TotalItems)> GetAdminBinsPagedAsync(
            string? search,
            string? district,
            string? status,
            int? collectorId,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
        Task<bool> ExistsSerialNumberOrQrAsync(string serialNumber, string qrCode, int? excludeBinId = null, CancellationToken cancellationToken = default);
        Task AddAsync(Models.SmartBin bin, CancellationToken cancellationToken = default);
        void Update(Models.SmartBin bin);
        Task AddDisposalItemAsync(DisposalItem item, CancellationToken cancellationToken = default);
        Task<WasteType?> GetWasteTypeByNameAsync(string name, CancellationToken cancellationToken = default);
        Task<WasteType?> GetDefaultWasteTypeAsync(CancellationToken cancellationToken = default);
        Task<List<WasteType>> GetAllWasteTypesAsync(CancellationToken cancellationToken = default);
        Task<Dictionary<int, WasteType>> GetWasteTypesDictionaryAsync(CancellationToken cancellationToken = default);
        Task<int> MarkOverdueBinsOfflineAsync(DateTime threshold, CancellationToken cancellationToken = default);
    }
}
