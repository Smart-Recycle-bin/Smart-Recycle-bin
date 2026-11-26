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

        public IngestionService(
            IBinRepository binRepository,
            IUnitOfWork unitOfWork,
            ISessionCoordinationService sessionService,
            IClassificationAdapter classificationAdapter,
            IStorageService storageService)
        {
            _binRepository = binRepository;
            _unitOfWork = unitOfWork;
            _sessionService = sessionService;
            _classificationAdapter = classificationAdapter;
            _storageService = storageService;
        }

        public async Task<IngestItemResponseDto> IngestItemAsync(int sessionId, IngestItemRequestDto request, string? deviceKey)
        {
            // 1. Validate session state via Member 2's session service
            await _sessionService.EnsureSessionActiveAsync(sessionId);

            // 2. Validate Image file
            if (request.Image == null || request.Image.Length == 0)
            {
                throw new ApiException(400, "VALIDATION_ERROR", "An image file is required.");
            }

            var contentType = request.Image.ContentType.ToLowerInvariant();
            var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png" };
            if (!allowedTypes.Contains(contentType))
            {
                throw new ApiException(400, "VALIDATION_ERROR", "Only JPEG and PNG images are supported.");
            }

            // 3. Classify Image via AI adapter
            using var stream = request.Image.OpenReadStream();
            var classification = await _classificationAdapter.ClassifyImageAsync(request.Image, stream);

            if (classification == null || string.IsNullOrWhiteSpace(classification.WasteType))
            {
                throw new ApiException(400, "CLASSIFICATION_FAILED", "The model could not produce a confident classification.");
            }

            // 4. Resolve WasteType from database
            var wasteType = await _binRepository.GetWasteTypeByNameAsync(classification.WasteType);
            if (wasteType == null)
            {
                wasteType = await _binRepository.GetDefaultWasteTypeAsync()
                    ?? new WasteType { WasteTypeId = 1, Name = WasteTypeNames.Plastic, BasePoints = 15 };
            }

            // 5. Store image to Cloudflare R2 under recycled-items
            var imagePath = await _storageService.UploadFileAsync(request.Image, "recycled-items");

            // 6. Persist DISPOSAL_ITEM and atomically extend Session.WindowExpiresAt in one transaction
            var disposalItem = new DisposalItem
            {
                SessionId = sessionId,
                WasteTypeId = wasteType.WasteTypeId,
                Image = imagePath,
                DetectedAt = request.CapturedAt == default ? DateTime.UtcNow : request.CapturedAt,
                EstimatedPoints = wasteType.BasePoints,
                AIConfidence = classification.ConfidenceScore
            };

            DateTime windowExpiresAt;
            await _unitOfWork.BeginTransactionAsync();
            try
            {
                await _binRepository.AddDisposalItemAsync(disposalItem);
                await _unitOfWork.SaveChangesAsync();

                windowExpiresAt = await _sessionService.ExtendSessionWindowAsync(sessionId, extendSeconds: 60);
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }

            // 7. Broadcast SignalR events only after successful DB persistence
            await _sessionService.NotifyItemIngestedAsync(
                sessionId,
                disposalItem.ItemId,
                wasteType.Name,
                disposalItem.EstimatedPoints,
                windowExpiresAt);

            return new IngestItemResponseDto
            {
                ItemId = disposalItem.ItemId,
                SessionId = sessionId,
                WasteType = wasteType.Name,
                ConfidenceScore = classification.ConfidenceScore,
                EstimatedPoints = disposalItem.EstimatedPoints,
                WindowExpiresAt = windowExpiresAt
            };
        }
    }
}
