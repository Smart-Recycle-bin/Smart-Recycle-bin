using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Sessions
{
    public class StartSessionRequestDto
    {
        [Required(ErrorMessage = "qrPayload is required.")]
        public string QrPayload { get; set; } = string.Empty;
    }

    public class StartSessionResponseDto
    {
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime WindowExpiresAt { get; set; }
        public int CountdownSeconds { get; set; } = 90;
        public int TotalPoints { get; set; } = 0;
        public List<SessionItemDto> Items { get; set; } = new();
    }

    public class SessionItemDto
    {
        public int ItemId { get; set; }
        public string WasteType { get; set; } = string.Empty;
        public int EstimatedPoints { get; set; }
        public int Points => EstimatedPoints;
        public string? ImageUrl { get; set; }
    }

    public class SessionStatusResponseDto
    {
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime? WindowExpiresAt { get; set; }
        public int CountdownSeconds { get; set; } = 0;
        public int TotalPoints { get; set; } = 0;
        public List<SessionItemDto> Items { get; set; } = new();
    }

    public class EndSessionResponseDto
    {
        public int SessionId { get; set; }
        public int BinId { get; set; }
        public string BinName { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string TerminationReason { get; set; } = string.Empty;
        public int CountdownSeconds { get; set; } = 0;
        public int TotalPoints { get; set; } = 0;
        public List<SessionItemDto> Items { get; set; } = new();
    }
}
