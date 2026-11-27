using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Users
{
    public class AdminRecyclerDto
    {
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public int AvailablePoints { get; set; }
        public int LifetimePoints { get; set; }
        public int TotalSessions { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime JoinedAt { get; set; }
    }

    public class SuspendUserRequestDto
    {
        [Required(ErrorMessage = "Reason for suspension is required.")]
        [MaxLength(500, ErrorMessage = "Reason cannot exceed 500 characters.")]
        public string Reason { get; set; } = string.Empty;
    }

    public class SuspendUserResponseDto
    {
        public int UserId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime SuspendedAt { get; set; }
    }

    public class UnsuspendUserRequestDto
    {
        [MaxLength(500, ErrorMessage = "Reason cannot exceed 500 characters.")]
        public string? Reason { get; set; }
    }

    public class UnsuspendUserResponseDto
    {
        public int UserId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public DateTime UnsuspendedAt { get; set; }
    }
}
