using SmartBin.Dtos.Bins;
using SmartBin.Dtos.Common;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;

namespace SmartBin.Services.Bins
{
    public class BinService : IBinService
    {
        private readonly IBinRepository _binRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMember5AnalyticsService _analyticsService;

        public BinService(
            IBinRepository binRepository,
            IUnitOfWork unitOfWork,
            IMember5AnalyticsService analyticsService)
        {
            _binRepository = binRepository;
            _unitOfWork = unitOfWork;
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

            var bins = await _binRepository.GetAllForSpatialQueryAsync();

            var result = new List<(SmartBin.Models.SmartBin Bin, double DistanceMeters)>();

            foreach (var bin in bins)
            {
                double dist = 0;
                if (lat.HasValue && lng.HasValue && bin.Latitude.HasValue && bin.Longitude.HasValue)
                {
                    dist = CalculateHaversineDistance(
                        lat.Value, lng.Value,
                        (double)bin.Latitude.Value, (double)bin.Longitude.Value);

                    double maxDistMeters = (radiusKm ?? 1.0) * 1000.0;
                    if (dist > maxDistMeters)
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
                QrCode = x.Bin.QRCode,
                Latitude = x.Bin.Latitude,
                Longitude = x.Bin.Longitude,
                Status = SmartBinStatus.ToCitizenStatus(x.Bin.Status),
                FillLevel = x.Bin.FillLevel,
                District = x.Bin.District,
                DistanceMeters = lat.HasValue && lng.HasValue ? (int)Math.Round(x.DistanceMeters) : 140,
                WalkingTimeMinutes = lat.HasValue && lng.HasValue ? (int)Math.Max(1, Math.Ceiling(x.DistanceMeters / 80.0)) : 2
            }).ToList();
        }

        public async Task<BinDetailsDto> GetBinDetailsAsync(int binId, string userRole)
        {
            var bin = await _binRepository.GetByIdWithCollectorAsync(binId);

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
            var allBins = await _binRepository.GetAllForSpatialQueryAsync();

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

            var (bins, totalItems) = await _binRepository.GetAdminBinsPagedAsync(
                search, district, status, collectorId, page, pageSize, sortBy, sortDir);

            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var items = bins.Select(b => new AdminBinDto
            {
                BinId = b.BinId,
                Name = $"Bin#{b.BinId:D3}",
                Area = b.District,
                District = b.District,
                Region = b.District ?? "Default",
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
            var district = !string.IsNullOrWhiteSpace(request.District) ? request.District : request.DistrictArea;
            if (string.IsNullOrWhiteSpace(district))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "district is required.",
                    new[] { new { field = "district", message = "district is required." } });
            }

            var exists = await _binRepository.ExistsSerialNumberOrQrAsync(request.DeviceSerial, $"QR-BIN-{request.DeviceSerial}");
            if (exists)
            {
                throw new ApiException(409, "DEVICE_ALREADY_REGISTERED", "This device serial is already registered.");
            }

            var bin = new SmartBin.Models.SmartBin
            {
                SerialNumber = request.DeviceSerial,
                District = district,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                CapacityThreshold = request.CapacityThresholdKg,
                QRCode = $"QR-BIN-{request.DeviceSerial}",
                Status = SmartBinStatus.Available,
                FillLevel = 0,
                CreatedAt = DateTime.UtcNow,
                LastHeartbeatAt = DateTime.UtcNow
            };

            await _binRepository.AddAsync(bin);
            await _unitOfWork.SaveChangesAsync();

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
            var bin = await _binRepository.GetByIdAsync(binId);
            if (bin == null)
            {
                throw new ApiException(404, "NOT_FOUND", "Bin not found.");
            }

            bin.Latitude = request.Latitude;
            bin.Longitude = request.Longitude;
            bin.District = request.District;
            bin.CapacityThreshold = request.CapacityThresholdKg;

            _binRepository.Update(bin);
            await _unitOfWork.SaveChangesAsync();

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
            var hoursLeft = Math.Max(2.0, (100.0 - (double)currentFill) * 0.75);
            return DateTime.UtcNow.AddHours(hoursLeft);
        }
    }
}
