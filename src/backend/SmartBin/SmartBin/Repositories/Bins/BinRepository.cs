using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Dtos.Bins;
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

        public async Task<(List<AdminBinDto> Items, int TotalItems)> GetAdminBinsPagedAsync(
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
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                var hasId = int.TryParse(s, out var id);
                query = query.Where(b =>
                    (hasId && b.BinId == id) ||
                    b.SerialNumber.Contains(s) ||
                    (b.Name != null && b.Name.Contains(s)) ||
                    (b.Area != null && b.Area.Contains(s)) ||
                    (b.District != null && b.District.Contains(s)) ||
                    (b.Collector != null && b.Collector.DisplayName.Contains(s)));
            }

            if (!string.IsNullOrWhiteSpace(district))
            {
                var normalizedDistrict = district.Trim().ToLower();
                query = query.Where(b => b.District != null && b.District.ToLower() == normalizedDistrict);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToUpper();
                query = query.Where(b => b.Status.ToUpper() == normalizedStatus);
            }

            if (collectorId.HasValue)
            {
                query = query.Where(b => b.CollectorId == collectorId.Value);
            }

            bool isDesc = string.Equals(sortDir?.Trim(), "desc", StringComparison.OrdinalIgnoreCase);
            var normalizedSortBy = sortBy?.Trim().ToLowerInvariant();

            IOrderedQueryable<Models.SmartBin> orderedQuery = normalizedSortBy switch
            {
                "name" => isDesc
                    ? query.OrderByDescending(b => b.Name).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.Name).ThenBy(b => b.BinId),
                "area" => isDesc
                    ? query.OrderByDescending(b => b.Area).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.Area).ThenBy(b => b.BinId),
                "district" => isDesc
                    ? query.OrderByDescending(b => b.District).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.District).ThenBy(b => b.BinId),
                "filllevel" => isDesc
                    ? query.OrderByDescending(b => b.FillLevel).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.FillLevel).ThenBy(b => b.BinId),
                "status" => isDesc
                    ? query.OrderByDescending(b => b.Status).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.Status).ThenBy(b => b.BinId),
                "collectorname" => isDesc
                    ? query.OrderByDescending(b => b.Collector != null ? b.Collector.DisplayName : null).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.Collector != null ? b.Collector.DisplayName : null).ThenBy(b => b.BinId),
                "lastservicedat" => isDesc
                    ? query.OrderByDescending(b => b.ServiceRecords.Max(sr => (DateTime?)sr.ServicedAt)).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.ServiceRecords.Max(sr => (DateTime?)sr.ServicedAt)).ThenBy(b => b.BinId),
                "createdat" => isDesc
                    ? query.OrderByDescending(b => b.CreatedAt).ThenByDescending(b => b.BinId)
                    : query.OrderBy(b => b.CreatedAt).ThenBy(b => b.BinId),
                _ => isDesc
                    ? query.OrderByDescending(b => b.BinId)
                    : query.OrderBy(b => b.BinId)
            };

            int totalItems = await query.CountAsync(cancellationToken);

            var items = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new AdminBinDto
                {
                    BinId = b.BinId,
                    Name = b.Name ?? string.Empty,
                    Area = b.Area,
                    District = b.District,
                    Region = null,
                    Latitude = b.Latitude,
                    Longitude = b.Longitude,
                    FillLevel = b.FillLevel,
                    CapacityThresholdKg = b.CapacityThreshold,
                    Status = b.Status,
                    CollectorId = b.CollectorId,
                    CollectorName = b.Collector != null ? b.Collector.DisplayName : null,
                    LastServicedAt = b.ServiceRecords.Max(sr => (DateTime?)sr.ServicedAt)
                })
                .ToListAsync(cancellationToken);

            return (items, totalItems);
        }

        public async Task<(List<BinMapItemDto> Items, int TotalItems)> GetMapBinsAsync(
            string? region,
            IReadOnlyCollection<string>? statuses,
            decimal? south,
            decimal? west,
            decimal? north,
            decimal? east,
            int maxItems,
            CancellationToken cancellationToken = default)
        {
            var query = _context.SmartBins
                .AsNoTracking()
                .Where(b =>
                    b.Latitude.HasValue &&
                    b.Longitude.HasValue &&
                    b.Latitude.Value >= -90m &&
                    b.Latitude.Value <= 90m &&
                    b.Longitude.Value >= -180m &&
                    b.Longitude.Value <= 180m)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(region))
            {
                var normalizedRegion = region.Trim().ToLower();
                if (!string.Equals(normalizedRegion, "all", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(b => b.District != null && b.District.ToLower() == normalizedRegion);
                }
            }

            if (statuses != null && statuses.Count > 0)
            {
                query = query.Where(b => statuses.Contains(b.Status.ToUpper()));
            }

            if (south.HasValue && west.HasValue && north.HasValue && east.HasValue)
            {
                query = query.Where(b =>
                    b.Latitude!.Value >= south.Value &&
                    b.Latitude!.Value <= north.Value &&
                    b.Longitude!.Value >= west.Value &&
                    b.Longitude!.Value <= east.Value);
            }

            int totalItems = await query.CountAsync(cancellationToken);

            var rawItems = await query
                .OrderByDescending(b => b.Status == SmartBinStatus.NeedsService95)
                .ThenByDescending(b => b.Status == SmartBinStatus.Full80)
                .ThenByDescending(b => b.FillLevel)
                .ThenBy(b => b.BinId)
                .Take(maxItems)
                .Select(b => new
                {
                    b.BinId,
                    b.Name,
                    b.Area,
                    b.District,
                    Latitude = b.Latitude!.Value,
                    Longitude = b.Longitude!.Value,
                    b.Status,
                    b.FillLevel,
                    CollectorName = b.Collector != null ? b.Collector.DisplayName : null,
                    LastServicedAt = b.ServiceRecords.Max(sr => (DateTime?)sr.ServicedAt),
                    b.CreatedAt,
                    b.LastHeartbeatAt,
                    b.AssignedAt
                })
                .ToListAsync(cancellationToken);

            var items = rawItems.Select(x =>
            {
                var updatedAt = EnsureUtc(x.CreatedAt);
                if (x.LastHeartbeatAt.HasValue)
                {
                    var heartbeat = EnsureUtc(x.LastHeartbeatAt.Value);
                    if (heartbeat > updatedAt) updatedAt = heartbeat;
                }
                if (x.AssignedAt.HasValue)
                {
                    var assigned = EnsureUtc(x.AssignedAt.Value);
                    if (assigned > updatedAt) updatedAt = assigned;
                }
                if (x.LastServicedAt.HasValue)
                {
                    var serviced = EnsureUtc(x.LastServicedAt.Value);
                    if (serviced > updatedAt) updatedAt = serviced;
                }

                return new BinMapItemDto
                {
                    BinId = x.BinId,
                    Name = string.IsNullOrWhiteSpace(x.Name) ? $"Bin#{x.BinId:D3}" : x.Name,
                    Area = x.Area ?? string.Empty,
                    District = x.District ?? string.Empty,
                    Region = string.Empty,
                    Latitude = x.Latitude,
                    Longitude = x.Longitude,
                    Status = x.Status,
                    FillLevel = x.FillLevel,
                    CollectorName = x.CollectorName,
                    LastServicedAt = x.LastServicedAt.HasValue ? EnsureUtc(x.LastServicedAt.Value) : null,
                    UpdatedAt = updatedAt
                };
            }).ToList();

            return (items, totalItems);
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
            var transitioned = await MarkOverdueBinsOfflineWithDetailsAsync(threshold, cancellationToken);
            return transitioned.Count;
        }

        public async Task<List<(int BinId, string? Name, string? District)>> MarkOverdueBinsOfflineWithDetailsAsync(
            DateTime threshold,
            CancellationToken cancellationToken = default)
        {
            var candidates = await _context.SmartBins
                .AsNoTracking()
                .Where(b => b.Status != SmartBinStatus.Offline && b.LastHeartbeatAt.HasValue && b.LastHeartbeatAt < threshold)
                .Select(b => new { b.BinId, b.Name, b.District })
                .ToListAsync(cancellationToken);

            var transitioned = new List<(int BinId, string? Name, string? District)>();
            foreach (var candidate in candidates)
            {
                var updated = await _context.SmartBins
                    .Where(b => b.BinId == candidate.BinId &&
                                b.Status != SmartBinStatus.Offline &&
                                b.LastHeartbeatAt.HasValue &&
                                b.LastHeartbeatAt < threshold)
                    .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, SmartBinStatus.Offline), cancellationToken);

                if (updated > 0)
                {
                    transitioned.Add((candidate.BinId, candidate.Name, candidate.District));
                }
            }

            return transitioned;
        }
    }
}
