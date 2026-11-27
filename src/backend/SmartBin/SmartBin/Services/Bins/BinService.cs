using System.Globalization;
using Microsoft.AspNetCore.Identity;
using SmartBin.Dtos.Bins;
using SmartBin.Dtos.Common;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;
using SmartBin.Services.Audit;

namespace SmartBin.Services.Bins
{
    public class BinService : IBinService
    {
        private readonly IBinRepository _binRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly UserManager<ApplicationUser> _userManager;

        private const int MaxMapItems = 5000;

        private static readonly HashSet<string> AllowedAdminSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "binId",
            "name",
            "area",
            "district",
            "fillLevel",
            "status",
            "collectorName",
            "lastServicedAt",
            "createdAt"
        };

        public BinService(
            IBinRepository binRepository,
            IAuditLogService auditLogService,
            IUnitOfWork unitOfWork,
            UserManager<ApplicationUser> userManager)
        {
            _binRepository = binRepository;
            _auditLogService = auditLogService;
            _unitOfWork = unitOfWork;
            _userManager = userManager;
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

        public async Task<(List<AdminBinDto> Items, PaginationMetaDto Meta)> GetAdminBinsAsync(
            string? search, string? district, string? status, int? collectorId,
            int page, int pageSize, string? sortBy, string? sortDir)
        {
            string? normalizedStatus = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                normalizedStatus = status.Trim().ToUpperInvariant();
                if (!SmartBinStatus.IsValid(normalizedStatus))
                {
                    throw new ApiException(400, "VALIDATION_ERROR", "Invalid status filter.",
                        new[] { new { field = "status", message = "Must be AVAILABLE, FULL_80, NEEDS_SERVICE_95 or OFFLINE." } });
                }
            }

            if (collectorId.HasValue && collectorId.Value <= 0)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid collectorId filter.",
                    new[] { new { field = "collectorId", message = "collectorId must be a positive integer." } });
            }

            var normalizedSortBy = string.IsNullOrWhiteSpace(sortBy) ? "binId" : sortBy.Trim();
            if (!AllowedAdminSortFields.Contains(normalizedSortBy))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid sortBy parameter.",
                    new[] { new { field = "sortBy", message = "sortBy must be one of: binId, name, area, district, fillLevel, status, collectorName, lastServicedAt, createdAt." } });
            }

            var normalizedSortDir = string.IsNullOrWhiteSpace(sortDir) ? "asc" : sortDir.Trim().ToLowerInvariant();
            if (normalizedSortDir != "asc" && normalizedSortDir != "desc")
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid sortDir parameter.",
                    new[] { new { field = "sortDir", message = "sortDir must be 'asc' or 'desc'." } });
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var (items, totalItems) = await _binRepository.GetAdminBinsPagedAsync(
                search, district, normalizedStatus, collectorId, page, pageSize, normalizedSortBy, normalizedSortDir);

            foreach (var item in items)
            {
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    item.Name = $"Bin#{item.BinId:D3}";
                }
                item.Region = null;
            }

            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = totalPages
            };

            return (items, meta);
        }

        public async Task<RegisterBinResponseDto> RegisterBinAsync(
            RegisterBinRequestDto request,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            var deviceSerial = request.DeviceSerial.Trim();
            if (string.IsNullOrWhiteSpace(deviceSerial))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "deviceSerial is required.",
                    new[] { new { field = "deviceSerial", message = "deviceSerial is required." } });
            }

            if (request.Name != null && string.IsNullOrWhiteSpace(request.Name))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "name cannot be empty or whitespace.",
                    new[] { new { field = "name", message = "name cannot be empty or whitespace." } });
            }

            var district = !string.IsNullOrWhiteSpace(request.District)
                ? request.District.Trim()
                : request.DistrictArea?.Trim();
            if (string.IsNullOrWhiteSpace(district))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "district is required.",
                    new[] { new { field = "district", message = "district is required." } });
            }

            var name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();
            var area = string.IsNullOrWhiteSpace(request.Area) ? null : request.Area.Trim();

            var exists = await _binRepository.ExistsSerialNumberOrQrAsync(deviceSerial, $"QR-BIN-{deviceSerial}");
            if (exists)
            {
                throw new ApiException(409, "DEVICE_ALREADY_REGISTERED", "This device serial is already registered.");
            }

            var bin = new SmartBin.Models.SmartBin
            {
                SerialNumber = deviceSerial,
                Name = name,
                Area = area,
                District = district,
                Latitude = request.Latitude!.Value,
                Longitude = request.Longitude!.Value,
                CapacityThreshold = request.CapacityThresholdKg!.Value,
                QRCode = $"QR-BIN-{deviceSerial}",
                Status = SmartBinStatus.Available,
                FillLevel = 0,
                CreatedAt = DateTime.UtcNow,
                LastHeartbeatAt = DateTime.UtcNow
            };

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                await _binRepository.AddAsync(bin);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.BinRegistration,
                    AuditResourceTypes.SmartBin,
                    bin.BinId.ToString(CultureInfo.InvariantCulture),
                    $"Smart bin registered (serial: {bin.SerialNumber}, district: {bin.District}).",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new RegisterBinResponseDto
            {
                BinId = bin.BinId,
                DeviceSerial = bin.SerialNumber,
                Name = bin.Name,
                Area = bin.Area,
                District = bin.District,
                Status = bin.Status,
                FillLevel = bin.FillLevel
            };
        }

        public async Task<UpdateBinMetadataResponseDto> UpdateBinMetadataAsync(
            int binId,
            UpdateBinMetadataRequestDto request,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            if (binId <= 0)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "binId must be a positive integer.",
                    new[] { new { field = "binId", message = "binId must be a positive integer." } });
            }

            if (request.Name != null && string.IsNullOrWhiteSpace(request.Name))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "name cannot be empty or whitespace.",
                    new[] { new { field = "name", message = "name cannot be empty or whitespace." } });
            }

            var district = request.District.Trim();
            if (string.IsNullOrWhiteSpace(district))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "district is required.",
                    new[] { new { field = "district", message = "district is required." } });
            }

            var bin = await _binRepository.GetByIdAsync(binId);
            if (bin == null)
            {
                throw new ApiException(404, "NOT_FOUND", "Bin not found.");
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                if (request.Name != null)
                {
                    bin.Name = request.Name.Trim();
                }

                if (request.Area != null)
                {
                    bin.Area = string.IsNullOrWhiteSpace(request.Area) ? null : request.Area.Trim();
                }

                bin.Latitude = request.Latitude!.Value;
                bin.Longitude = request.Longitude!.Value;
                bin.District = district;
                bin.CapacityThreshold = request.CapacityThresholdKg!.Value;

                _binRepository.Update(bin);

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.FleetUpdate,
                    AuditResourceTypes.SmartBin,
                    bin.BinId.ToString(CultureInfo.InvariantCulture),
                    $"Updated bin metadata (district: {bin.District}, threshold: {bin.CapacityThreshold} kg).",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new UpdateBinMetadataResponseDto
            {
                BinId = bin.BinId,
                Name = bin.Name,
                Area = bin.Area,
                Latitude = bin.Latitude!.Value,
                Longitude = bin.Longitude!.Value,
                District = bin.District!,
                CapacityThresholdKg = bin.CapacityThreshold!.Value
            };
        }

        public async Task<(List<BinMapItemDto> Items, BinMapMetaDto Meta)> GetMapBinsAsync(
            string? region, string? status, string? bbox)
        {
            if (region != null && region.Trim().Length > 150)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Invalid region filter.",
                    new[] { new { field = "region", message = "region must not exceed 150 characters." } });
            }

            HashSet<string>? normalizedStatuses = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                var tokens = status.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (tokens.Length == 0)
                {
                    throw new ApiException(400, "VALIDATION_ERROR", "Invalid status filter.",
                        new[] { new { field = "status", message = "Must be AVAILABLE, FULL_80, NEEDS_SERVICE_95 or OFFLINE." } });
                }

                normalizedStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var token in tokens)
                {
                    var upper = token.ToUpperInvariant();
                    if (!SmartBinStatus.IsValid(upper))
                    {
                        throw new ApiException(400, "VALIDATION_ERROR", "Invalid status filter.",
                            new[] { new { field = "status", message = "Must be AVAILABLE, FULL_80, NEEDS_SERVICE_95 or OFFLINE." } });
                    }
                    normalizedStatuses.Add(upper);
                }
            }

            decimal? south = null;
            decimal? west = null;
            decimal? north = null;
            decimal? east = null;

            if (!string.IsNullOrWhiteSpace(bbox))
            {
                var parts = bbox.Split(',', StringSplitOptions.TrimEntries);
                if (parts.Length != 4 ||
                    !decimal.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedSouth) ||
                    !decimal.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedWest) ||
                    !decimal.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedNorth) ||
                    !decimal.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out var parsedEast) ||
                    parsedSouth < -90m || parsedSouth > 90m ||
                    parsedNorth < -90m || parsedNorth > 90m ||
                    parsedWest < -180m || parsedWest > 180m ||
                    parsedEast < -180m || parsedEast > 180m ||
                    parsedSouth > parsedNorth ||
                    parsedWest > parsedEast)
                {
                    throw new ApiException(400, "VALIDATION_ERROR", "Invalid bbox.",
                        new[] { new { field = "bbox", message = "Use south,west,north,east." } });
                }

                south = parsedSouth;
                west = parsedWest;
                north = parsedNorth;
                east = parsedEast;
            }

            var (items, totalItems) = await _binRepository.GetMapBinsAsync(
                region, normalizedStatuses, south, west, north, east, MaxMapItems);

            var meta = new BinMapMetaDto
            {
                TotalItems = totalItems,
                Returned = items.Count,
                Truncated = totalItems > items.Count,
                GeneratedAt = DateTime.UtcNow
            };

            return (items, meta);
        }

        public async Task<AssignBinResponseDto> AssignCollectorAsync(
            int binId,
            AssignBinRequestDto request,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            if (binId <= 0)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "binId must be a positive integer.",
                    new[] { new { field = "binId", message = "binId must be a positive integer." } });
            }

            var collectorId = request.CollectorId!.Value;
            var bin = await _binRepository.GetByIdAsync(binId);
            if (bin == null)
            {
                throw new ApiException(404, "NOT_FOUND", "Bin not found.");
            }

            var collector = await _userManager.FindByIdAsync(collectorId.ToString());
            if (collector == null)
            {
                throw new ApiException(404, "NOT_FOUND", "Collector account not found.");
            }

            if (!await _userManager.IsInRoleAsync(collector, "OPS_COLLECTOR"))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "collectorId does not belong to a collector account.",
                    new[] { new { field = "collectorId", message = "collectorId does not belong to a collector account." } });
            }

            var isLockedOut = collector.LockoutEnabled &&
                              collector.LockoutEnd.HasValue &&
                              collector.LockoutEnd.Value > DateTimeOffset.UtcNow;

            if (!string.Equals(collector.AccountStatus?.Trim(), "active", StringComparison.OrdinalIgnoreCase) || isLockedOut)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Collector account is not active.",
                    new[] { new { field = "collectorId", message = "Collector account is not active." } });
            }

            var assignedAt = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                bin.CollectorId = collector.Id;
                bin.AssignedAt = assignedAt;

                _binRepository.Update(bin);

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.BinAssignment,
                    AuditResourceTypes.SmartBin,
                    bin.BinId.ToString(CultureInfo.InvariantCulture),
                    $"Assigned collector {collector.DisplayName} (#{collector.Id}) to bin.",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new AssignBinResponseDto
            {
                BinId = bin.BinId,
                AssignedCollectorId = collector.Id,
                AssignedAt = assignedAt.ToString("O")
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
