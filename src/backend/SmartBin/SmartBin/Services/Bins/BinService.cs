using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Dtos.Bins;
using SmartBin.Dtos.Common;
using SmartBin.Models.Constants;

namespace SmartBin.Services.Bins
{
    public class BinService : IBinService
    {
        private readonly AppDbContext _context;
        private readonly IMember5AnalyticsService _analyticsService;

        public BinService(AppDbContext context, IMember5AnalyticsService analyticsService)
        {
            _context = context;
            _analyticsService = analyticsService;
        }

        public async Task<List<CitizenBinDto>> GetNearbyBinsAsync(double? lat, double? lng, double? radiusKm)
        {
            if (lat.HasValue && (lat.Value < -90.0 || lat.Value > 90.0))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid coordinates.",
                    new[] { new { field = "lat", message = "Must be between -90 and 90." } });
            }

            if (lng.HasValue && (lng.Value < -180.0 || lng.Value > 180.0))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid coordinates.",
                    new[] { new { field = "lng", message = "Must be between -180 and 180." } });
            }

            var query = _context.SmartBins.AsNoTracking();
            var bins = await query.ToListAsync();

            var result = new List<(SmartBin.Models.SmartBin Bin, double DistanceMeters)>();

            foreach (var bin in bins)
            {
                double dist = 0;
                if (lat.HasValue && lng.HasValue && bin.Latitude.HasValue && bin.Longitude.HasValue)
                {
                    dist = CalculateHaversineDistance(
                        lat.Value, lng.Value,
                        (double)bin.Latitude.Value, (double)bin.Longitude.Value);

                    if (radiusKm.HasValue && dist > (radiusKm.Value * 1000.0))
                    {
                        continue;
                    }
                }

                result.Add((bin, dist));
            }

            if (lat.HasValue && lng.HasValue)
            {
                result = result.OrderBy(x => x.DistanceMeters).ToList();
            }

            return result.Select(x => new CitizenBinDto
            {
                BinId = x.Bin.BinId,
                Name = $"Bin#{x.Bin.BinId:D3}",
                Latitude = x.Bin.Latitude,
                Longitude = x.Bin.Longitude,
                Status = SmartBinStatus.ToCitizenStatus(x.Bin.Status),
                FillLevel = x.Bin.FillLevel,
                District = x.Bin.District
            }).ToList();
        }

        public async Task<BinDetailsDto> GetBinDetailsAsync(int binId, string userRole)
        {
            var bin = await _context.SmartBins
                .AsNoTracking()
                .Include(b => b.Collector)
                .FirstOrDefaultAsync(b => b.BinId == binId);

            if (bin == null)
            {
                throw new ApiException(404, "NOT_FOUND", "Bin not found.");
            }

            bool isCitizen = string.Equals(userRole, "USER_CITIZEN", StringComparison.OrdinalIgnoreCase);

            return new BinDetailsDto
            {
                BinId = bin.BinId,
                Name = $"Bin#{bin.BinId:D3}",
                Latitude = bin.Latitude,
                Longitude = bin.Longitude,
                Status = isCitizen ? SmartBinStatus.ToCitizenStatus(bin.Status) : bin.Status,
                FillLevel = bin.FillLevel,
                District = bin.District,
                AssignedCollectorId = isCitizen ? null : bin.CollectorId,
                PredictedFullAt = isCitizen ? null : EstimatePredictedFullAt(bin.FillLevel)
            };
        }

        public async Task<List<SearchBinDto>> SearchBinsAsync(string query, double? lat, double? lng, int limit)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "The request contains invalid fields.",
                    new[] { new { field = "query", message = "A search query is required." } });
            }

            limit = Math.Clamp(limit, 1, 50);

            var normalizedQuery = query.Trim().ToLowerInvariant();
            var allBins = await _context.SmartBins.AsNoTracking().ToListAsync();

            var matchingBins = allBins.Where(b =>
                (b.District != null && b.District.ToLowerInvariant().Contains(normalizedQuery)) ||
                b.SerialNumber.ToLowerInvariant().Contains(normalizedQuery) ||
                b.BinId.ToString().Contains(normalizedQuery)
            ).ToList();

            var results = new List<SearchBinDto>();

            foreach (var bin in matchingBins)
            {
                int? distanceMeters = null;
                int? walkingTimeMinutes = null;

                if (lat.HasValue && lng.HasValue && bin.Latitude.HasValue && bin.Longitude.HasValue)
                {
                    double dist = CalculateHaversineDistance(
                        lat.Value, lng.Value,
                        (double)bin.Latitude.Value, (double)bin.Longitude.Value);

                    distanceMeters = (int)Math.Round(dist);
                    // Approx 12 minutes per kilometer (walking pace)
                    walkingTimeMinutes = Math.Max(1, (int)Math.Round(dist / 1000.0 * 12.0));
                }

                results.Add(new SearchBinDto
                {
                    BinId = bin.BinId,
                    Name = $"Bin#{bin.BinId:D3}",
                    Latitude = bin.Latitude,
                    Longitude = bin.Longitude,
                    District = bin.District,
                    Status = SmartBinStatus.ToCitizenStatus(bin.Status),
                    FillLevel = bin.FillLevel,
                    DistanceMeters = distanceMeters,
                    WalkingTimeMinutes = walkingTimeMinutes
                });
            }

            if (lat.HasValue && lng.HasValue)
            {
                results = results.OrderBy(r => r.DistanceMeters ?? int.MaxValue).ToList();
            }

            return results.Take(limit).ToList();
        }

        public async Task<(List<AdminBinDto> Items, PaginationMetaDto Meta, AdminBinSummaryDto Summary)> GetAdminBinsAsync(
            string? search, string? district, string? status, int? collectorId,
            int page, int pageSize, string? sortBy, string? sortDir)
        {
            if (!string.IsNullOrWhiteSpace(status) && !SmartBinStatus.IsValid(status))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid status filter.",
                    new[] { new { field = "status", message = "Must be AVAILABLE, FULL_80, NEEDS_SERVICE_95 or OFFLINE." } });
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

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

            int totalItems = await query.CountAsync();
            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var bins = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = bins.Select(b => new AdminBinDto
            {
                BinId = b.BinId,
                District = b.District,
                Latitude = b.Latitude,
                Longitude = b.Longitude,
                FillLevel = b.FillLevel,
                Status = b.Status,
                CollectorId = b.CollectorId,
                CollectorName = b.Collector?.DisplayName,
                LastServicedAt = b.ServiceRecords.OrderByDescending(sr => sr.ServicedAt).Select(sr => (DateTime?)sr.ServicedAt).FirstOrDefault()
            }).ToList();

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };

            var summary = await _analyticsService.GetAdminBinSummaryAsync();

            return (items, meta, summary);
        }

        public async Task<RegisterBinResponseDto> RegisterBinAsync(RegisterBinRequestDto request)
        {
            var exists = await _context.SmartBins.AnyAsync(b => b.SerialNumber == request.DeviceSerial);
            if (exists)
            {
                throw new ApiException(409, "DEVICE_ALREADY_REGISTERED", "This device serial is already registered.");
            }

            var bin = new SmartBin.Models.SmartBin
            {
                SerialNumber = request.DeviceSerial,
                District = request.DistrictArea,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                CapacityThreshold = request.CapacityThresholdKg,
                QRCode = $"QR-BIN-{request.DeviceSerial}",
                Status = SmartBinStatus.Available,
                FillLevel = 0,
                CreatedAt = DateTime.UtcNow,
                LastHeartbeatAt = DateTime.UtcNow
            };

            _context.SmartBins.Add(bin);
            await _context.SaveChangesAsync();

            return new RegisterBinResponseDto
            {
                BinId = bin.BinId,
                DeviceSerial = bin.SerialNumber,
                Status = bin.Status,
                FillLevel = bin.FillLevel
            };
        }

        public async Task<UpdateBinMetadataResponseDto> UpdateBinMetadataAsync(int binId, UpdateBinMetadataRequestDto request)
        {
            var bin = await _context.SmartBins.FirstOrDefaultAsync(b => b.BinId == binId);
            if (bin == null)
            {
                throw new ApiException(404, "NOT_FOUND", "Bin not found.");
            }

            bin.Latitude = request.Latitude;
            bin.Longitude = request.Longitude;
            bin.District = request.District;
            bin.CapacityThreshold = request.CapacityThresholdKg;

            await _context.SaveChangesAsync();

            return new UpdateBinMetadataResponseDto
            {
                BinId = bin.BinId,
                Latitude = bin.Latitude ?? request.Latitude,
                Longitude = bin.Longitude ?? request.Longitude,
                District = bin.District ?? request.District,
                CapacityThresholdKg = bin.CapacityThreshold ?? request.CapacityThresholdKg
            };
        }

        private static double CalculateHaversineDistance(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000.0; // Earth radius in meters
            var dLat = (lat2 - lat1) * Math.PI / 180.0;
            var dLon = (lon2 - lon1) * Math.PI / 180.0;

            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return R * c;
        }

        private static DateTime EstimatePredictedFullAt(decimal currentFill)
        {
            // Linear projection: 100% capacity projected forward based on fill
            var hoursLeft = Math.Max(2.0, (100.0 - (double)currentFill) * 0.75);
            return DateTime.UtcNow.AddHours(hoursLeft);
        }
    }
}
