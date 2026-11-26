using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Bins
{
    public class BinRepository : IBinRepository
    {
        private readonly AppDbContext _context;

        public BinRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Models.SmartBin?> GetByIdAsync(int binId, CancellationToken cancellationToken = default)
        {
            return await _context.SmartBins
                .FirstOrDefaultAsync(b => b.BinId == binId, cancellationToken);
        }

        public async Task<Models.SmartBin?> GetByIdWithCollectorAsync(int binId, CancellationToken cancellationToken = default)
        {
            return await _context.SmartBins
                .AsNoTracking()
                .Include(b => b.Collector)
                .FirstOrDefaultAsync(b => b.BinId == binId, cancellationToken);
        }

        public async Task<List<Models.SmartBin>> GetAllForSpatialQueryAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SmartBins
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }

        public async Task<(List<Models.SmartBin> Items, int TotalItems)> GetAdminBinsPagedAsync(
            string? search,
            string? district,
            string? status,
            int? collectorId,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SmartBins
                .AsNoTracking()
                .Include(b => b.Collector)
                .Include(b => b.ServiceRecords)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                if (int.TryParse(s, out var id))
                {
                    query = query.Where(b => b.BinId == id || b.SerialNumber.Contains(s));
                }
                else
                {
                    query = query.Where(b => b.SerialNumber.Contains(s));
                }
            }

            if (!string.IsNullOrWhiteSpace(district))
            {
                query = query.Where(b => b.District != null && b.District.Contains(district));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(b => b.Status.ToUpper() == status.ToUpper());
            }

            if (collectorId.HasValue)
            {
                query = query.Where(b => b.CollectorId == collectorId.Value);
            }

            bool isDesc = string.Equals(sortDir, "desc", StringComparison.OrdinalIgnoreCase);

            query = sortBy?.ToLowerInvariant() switch
            {
                "filllevel" => isDesc ? query.OrderByDescending(b => b.FillLevel) : query.OrderBy(b => b.FillLevel),
                "district" => isDesc ? query.OrderByDescending(b => b.District) : query.OrderBy(b => b.District),
                "status" => isDesc ? query.OrderByDescending(b => b.Status) : query.OrderBy(b => b.Status),
                "createdat" => isDesc ? query.OrderByDescending(b => b.CreatedAt) : query.OrderBy(b => b.CreatedAt),
                _ => isDesc ? query.OrderByDescending(b => b.BinId) : query.OrderBy(b => b.BinId)
            };

            int totalItems = await query.CountAsync(cancellationToken);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return (items, totalItems);
        }

        public async Task<bool> ExistsSerialNumberOrQrAsync(
            string serialNumber,
            string qrCode,
            int? excludeBinId = null,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SmartBins.AsNoTracking();

            if (excludeBinId.HasValue)
            {
                query = query.Where(b => b.BinId != excludeBinId.Value);
            }

            return await query.AnyAsync(
                b => b.SerialNumber == serialNumber || b.QRCode == qrCode,
                cancellationToken);
        }

        public async Task AddAsync(Models.SmartBin bin, CancellationToken cancellationToken = default)
        {
            await _context.SmartBins.AddAsync(bin, cancellationToken);
        }

        public void Update(Models.SmartBin bin)
        {
            _context.SmartBins.Update(bin);
        }

        public async Task AddDisposalItemAsync(DisposalItem item, CancellationToken cancellationToken = default)
        {
            await _context.DisposalItems.AddAsync(item, cancellationToken);
        }

        public async Task<WasteType?> GetWasteTypeByNameAsync(string name, CancellationToken cancellationToken = default)
        {
            return await _context.WasteTypes
                .FirstOrDefaultAsync(wt => wt.Name.ToUpper() == name.ToUpper(), cancellationToken);
        }

        public async Task<WasteType?> GetDefaultWasteTypeAsync(CancellationToken cancellationToken = default)
        {
            return await _context.WasteTypes
                .FirstOrDefaultAsync(wt => wt.Name == WasteTypeNames.Plastic, cancellationToken);
        }

        public async Task<List<WasteType>> GetAllWasteTypesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.WasteTypes
                .AsNoTracking()
                .ToListAsync(cancellationToken);
        }

        public async Task<Dictionary<int, WasteType>> GetWasteTypesDictionaryAsync(CancellationToken cancellationToken = default)
        {
            return await _context.WasteTypes
                .AsNoTracking()
                .ToDictionaryAsync(wt => wt.WasteTypeId, cancellationToken);
        }

        public async Task<int> MarkOverdueBinsOfflineAsync(DateTime threshold, CancellationToken cancellationToken = default)
        {
            return await _context.SmartBins
                .Where(b => b.Status != SmartBinStatus.Offline && b.LastHeartbeatAt.HasValue && b.LastHeartbeatAt < threshold)
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, SmartBinStatus.Offline), cancellationToken);
        }
    }
}
