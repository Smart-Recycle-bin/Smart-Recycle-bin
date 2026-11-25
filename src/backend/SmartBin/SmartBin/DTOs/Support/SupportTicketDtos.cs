using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Support
{
    public class CreateSupportTicketRequestDto
    {
        public string Category { get; set; } = "general";

        [Required(ErrorMessage = "description is required.")]
        public string Description { get; set; } = string.Empty;

        public string? SessionId { get; set; }
    }
}
