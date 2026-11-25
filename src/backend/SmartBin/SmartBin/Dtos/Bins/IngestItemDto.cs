using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace SmartBin.Dtos.Bins
{
    public class IngestItemRequestDto
    {
        [Required(ErrorMessage = "image is required.")]
        public IFormFile Image { get; set; } = null!;

        [Required(ErrorMessage = "capturedAt is required.")]
        public DateTime CapturedAt { get; set; }
    }

    public class IngestItemResponseDto
    {
        public int ItemId { get; set; }
        public int SessionId { get; set; }
        public string WasteType { get; set; } = string.Empty;
        public decimal ConfidenceScore { get; set; }
        public int EstimatedPoints { get; set; }
        public DateTime WindowExpiresAt { get; set; }
    }
}
