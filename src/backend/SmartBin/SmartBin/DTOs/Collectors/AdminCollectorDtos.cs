using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Collectors
{
    public class AdminCollectorDto
    {
        public int CollectorId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public int AssignedBinsCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime LastActiveAt { get; set; }
    }

    public class CreateCollectorRequestDto
    {
        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [MaxLength(256, ErrorMessage = "Email cannot exceed 256 characters.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Full name is required.")]
        [MaxLength(100, ErrorMessage = "Full name cannot exceed 100 characters.")]
        public string DisplayName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone number is required.")]
        [MaxLength(30, ErrorMessage = "Phone number cannot exceed 30 characters.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(150, ErrorMessage = "District cannot exceed 150 characters.")]
        public string? District { get; set; }

        [MaxLength(50, ErrorMessage = "Credentials mode cannot exceed 50 characters.")]
        public string? CredentialsMode { get; set; }

        [MaxLength(128, ErrorMessage = "Temporary password cannot exceed 128 characters.")]
        public string? TemporaryPassword { get; set; }
    }

    public class CreateCollectorResponseDto
    {
        public int CollectorId { get; set; }
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? District { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CredentialsMode { get; set; } = string.Empty;
        public bool InviteEmailSent { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class UpdateCollectorRequestDto
    {
        [MaxLength(100, ErrorMessage = "Full name cannot exceed 100 characters.")]
        public string? DisplayName { get; set; }

        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [MaxLength(256, ErrorMessage = "Email cannot exceed 256 characters.")]
        public string? Email { get; set; }

        [MaxLength(30, ErrorMessage = "Phone number cannot exceed 30 characters.")]
        public string? PhoneNumber { get; set; }

        [MaxLength(150, ErrorMessage = "District cannot exceed 150 characters.")]
        public string? District { get; set; }
    }

    public class AdminAssignedBinDto
    {
        public int BinId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Area { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public decimal FillLevel { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? LastServicedAt { get; set; }
    }

    public class DeactivateCollectorResponseDto
    {
        public int CollectorId { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime DeactivatedAt { get; set; }
    }
}
