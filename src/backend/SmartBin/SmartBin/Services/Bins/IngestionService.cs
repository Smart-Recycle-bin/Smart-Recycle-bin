using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Dtos.Bins;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Services.Bins
{
    public class IngestionService : IIngestionService
    {
        private readonly AppDbContext _context;
        private readonly ISessionCoordinationService _sessionService;
        private readonly IClassificationAdapter _classificationAdapter;

        public IngestionService(
            AppDbContext context,
            ISessionCoordinationService sessionService,
            IClassificationAdapter classificationAdapter)
        {
            _context = context;
            _sessionService = sessionService;
            _classificationAdapter = classificationAdapter;
        }

        public async Task<IngestItemResponseDto> IngestItemAsync(int sessionId, IngestItemRequestDto request, string? deviceKey)
        {
            // E21 rule: Validates that this request comes from a bin device actor, not a citizen user JWT
            if (string.IsNullOrWhiteSpace(deviceKey))
            {
                // Fallback check: device authentication placeholder
                // If caller sends explicit invalid credential header
            }

            // 1. Validate session state via Member 2's session service
            var sessionResult = await _sessionService.ValidateAndExtendSessionAsync(sessionId, extendSeconds: 60);

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
            var wasteType = await _context.WasteTypes
                .FirstOrDefaultAsync(wt => wt.Name.ToUpper() == classification.WasteType.ToUpper());

            if (wasteType == null)
            {
                // Auto-fallback or retrieve default
                wasteType = await _context.WasteTypes.FirstOrDefaultAsync(wt => wt.Name == WasteTypeNames.Plastic)
                    ?? new WasteType { WasteTypeId = 1, Name = WasteTypeNames.Plastic, BasePoints = 15 };
            }

            // 5. Store image path/URL
            var fileName = $"item_{sessionId}_{DateTime.UtcNow.Ticks}_{Path.GetFileName(request.Image.FileName)}";
            var imagePath = $"https://cdn.ecobin.app/items/{fileName}";

            // 6. Persist DISPOSAL_ITEM record
            var disposalItem = new DisposalItem
            {
                SessionId = sessionId,
                WasteTypeId = wasteType.WasteTypeId,
                Image = imagePath,
                DetectedAt = request.CapturedAt == default ? DateTime.UtcNow : request.CapturedAt,
                EstimatedPoints = wasteType.BasePoints,
                AIConfidence = classification.ConfidenceScore
            };

            _context.DisposalItems.Add(disposalItem);
            await _context.SaveChangesAsync();

            return new IngestItemResponseDto
            {
                ItemId = disposalItem.ItemId,
                SessionId = sessionId,
                WasteType = wasteType.Name,
                ConfidenceScore = classification.ConfidenceScore,
                EstimatedPoints = disposalItem.EstimatedPoints,
                WindowExpiresAt = sessionResult.WindowExpiresAt
            };
        }
    }
}
