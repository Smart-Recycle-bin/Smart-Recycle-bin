using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Support
{
    public class CreateSupportTicketRequestDto
    {
        [MaxLength(50)]
        public string Category { get; set; } = "general_inquiry";

        [Required(ErrorMessage = "description is required.")]
        [MaxLength(2000, ErrorMessage = "description cannot exceed 2000 characters.")]
        public string Description { get; set; } = string.Empty;

        [MaxLength(64)]
        public string? SessionId { get; set; }
    }

    public class SupportTicketResponseDto
    {
        public string TicketId { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? SessionId { get; set; }
        public string Status { get; set; } = "open";
        public DateTime CreatedAt { get; set; }
    }
}
