using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using SmartBin.Dtos.Bins;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Bins;

namespace SmartBin.Services.Bins
{
    public class IngestionService : IIngestionService
    {
        private readonly IBinRepository _binRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ISessionCoordinationService _sessionService;
        private readonly IClassificationAdapter _classificationAdapter;
        private readonly IStorageService _storageService;
        private readonly IConfiguration _configuration;

        public IngestionService(
            IBinRepository binRepository,
            IUnitOfWork unitOfWork,
            ISessionCoordinationService sessionService,
            IClassificationAdapter classificationAdapter,
            IStorageService storageService,
            IConfiguration configuration)
        {
            _binRepository = binRepository;
            _unitOfWork = unitOfWork;
            _sessionService = sessionService;
            _classificationAdapter = classificationAdapter;
            _storageService = storageService;
            _configuration = configuration;
        }

        public async Task<IngestItemResponseDto> IngestItemAsync(int sessionId, IngestItemRequestDto request, string? deviceKey)
        {
            ValidateDeviceKeyIfConfigured(deviceKey);
            var activeSession = await _sessionService.EnsureSessionActiveAsync(sessionId);
            return await IngestForSessionCoreAsync(activeSession, request.Image, request.CapturedAt);
        }

        public async Task<IngestItemResponseDto> IngestItemByBinAsync(string binIdentifier, IngestBinItemRequestDto request, string? deviceKey)
        {
            ValidateDeviceKeyIfConfigured(deviceKey);

            var bin = await _binRepository.GetByIdentifierAsync(binIdentifier);
            if (bin == null)
            {
                throw new ApiException(404, "BIN_NOT_FOUND", "Bin not found.");
            }

            var activeSession = await _sessionService.ResolveActiveSessionForBinAsync(bin.BinId);
            var imageFile = request.Image ?? request.File;
            return await IngestForSessionCoreAsync(activeSession, imageFile, request.CapturedAt ?? DateTime.UtcNow);
        }

        private void ValidateDeviceKeyIfConfigured(string? deviceKey)
        {
            var expectedKey = _configuration["DeviceIngestion:ApiKey"];
            if (!string.IsNullOrWhiteSpace(expectedKey) &&
                !string.Equals(deviceKey, expectedKey, StringComparison.Ordinal))
            {
                throw new ApiException(401, "UNAUTHORIZED", "Invalid or missing X-Device-Key.");
            }
        }

        private async Task<IngestItemResponseDto> IngestForSessionCoreAsync(
            ActiveSessionContext sessionContext,
            IFormFile? image,
            DateTime capturedAt)
        {
            if (image == null || image.Length == 0)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "An image file is required.");
            }

            var contentType = (image.ContentType ?? string.Empty).ToLowerInvariant();
            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png" };
            if (!string.IsNullOrEmpty(contentType) && !allowedTypes.Contains(contentType))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Only JPEG and PNG images are supported.");
            }

            using var stream = image.OpenReadStream();
            var classification = await _classificationAdapter.ClassifyImageAsync(image, stream);

            if (classification == null || string.IsNullOrWhiteSpace(classification.WasteType))
            {
                throw new ApiException(400, "CLASSIFICATION_FAILED", "The model could not produce a confident classification.");
            }

            var wasteType = await _binRepository.GetWasteTypeByNameAsync(classification.WasteType)
                ?? await _binRepository.GetDefaultWasteTypeAsync()
                ?? new WasteType { WasteTypeId = 1, Name = WasteTypeNames.Plastic, BasePoints = 15 };

            var imagePath = await _storageService.UploadFileAsync(image, "recycled-items");

            var disposalItem = new DisposalItem
            {
                SessionId = sessionContext.SessionId,
                WasteTypeId = wasteType.WasteTypeId,
                Image = imagePath,
                DetectedAt = capturedAt == default ? DateTime.UtcNow : capturedAt,
                EstimatedPoints = wasteType.BasePoints,
                AIConfidence = classification.ConfidenceScore
            };

            DateTime windowExpiresAt;
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                await _binRepository.AddDisposalItemAsync(disposalItem);
                await _unitOfWork.SaveChangesAsync();

                windowExpiresAt = await _sessionService.ExtendSessionWindowAsync(sessionContext.SessionId, extendSeconds: 60);
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }

            await _sessionService.NotifyItemIngestedAsync(
                sessionContext.SessionId,
                disposalItem.ItemId,
                wasteType.Name,
                disposalItem.EstimatedPoints,
                windowExpiresAt);

            return new IngestItemResponseDto
            {
                ItemId = disposalItem.ItemId,
                SessionId = sessionContext.SessionId,
                BinId = sessionContext.BinId,
                UserId = sessionContext.UserId,
                WasteType = wasteType.Name,
                PredictedLabel = string.IsNullOrWhiteSpace(classification.PredictedLabel)
                    ? WasteClassificationMapping.ToModelLabel(wasteType.Name)
                    : classification.PredictedLabel,
                Angle = classification.Angle != 0 || string.Equals(wasteType.Name, WasteTypeNames.Paper, StringComparison.OrdinalIgnoreCase)
                    ? classification.Angle
                    : WasteClassificationMapping.ToBinAngle(wasteType.Name),
                ConfidenceScore = classification.ConfidenceScore,
                EstimatedPoints = disposalItem.EstimatedPoints,
                WindowExpiresAt = windowExpiresAt
            };
        }
    }
}
