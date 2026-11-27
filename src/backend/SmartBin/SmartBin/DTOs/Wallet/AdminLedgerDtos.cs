using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartBin.DTOs.Wallet
{
    public class AdminLedgerRowDto
    {
        public int TransactionId { get; set; }
        public DateTime Timestamp { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public int? BinId { get; set; }
        public string? BinName { get; set; }
        public string DetailText { get; set; } = string.Empty;
        public int PointsDelta { get; set; }
        public int RunningBalance { get; set; }
        public string EntryType { get; set; } = string.Empty;
        public string Source { get; set; } = string.Empty;
        public bool IsManualAdjustment { get; set; }
        public string? ReasonCode { get; set; }
        public string? ReasonNote { get; set; }
    }

    public class ManualAdjustmentRequestDto
    {
        [Required(ErrorMessage = "userId is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "userId must be a positive integer.")]
        public int? UserId { get; set; }

        [Required(ErrorMessage = "amount is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "amount must be a positive integer.")]
        public int? Amount { get; set; }

        [Required(ErrorMessage = "type is required.")]
        public string Type { get; set; } = string.Empty;

        [Required(ErrorMessage = "reasonCode is required.")]
        [MaxLength(100, ErrorMessage = "reasonCode cannot exceed 100 characters.")]
        public string ReasonCode { get; set; } = string.Empty;

        [Required(ErrorMessage = "reasonNote is required.")]
        [MaxLength(500, ErrorMessage = "reasonNote cannot exceed 500 characters.")]
        public string ReasonNote { get; set; } = string.Empty;

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? AdditionalProperties { get; set; }
    }

    public class ManualAdjustmentResponseDto
    {
        public int TransactionId { get; set; }
        public int UserId { get; set; }
        public int PointsDelta { get; set; }
        public int BalanceAfter { get; set; }
    }
}
