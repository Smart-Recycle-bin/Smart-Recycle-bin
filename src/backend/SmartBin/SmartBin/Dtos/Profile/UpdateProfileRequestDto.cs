using System.ComponentModel.DataAnnotations;

namespace SmartBin.DTOs.Profile
{
    /// <summary>
    /// Fields accepted by PUT /api/v1/profile.
    /// Sent as multipart/form-data (when a photo is included) or application/json.
    /// </summary>
    public class UpdateProfileRequestDto
    {
        [MaxLength(100, ErrorMessage = "Display name must be at most 100 characters.")]
        public string? DisplayName { get; set; }

        /// <summary>E.164 phone number, e.g. +201112223334</summary>
        [Phone(ErrorMessage = "Phone number is not valid.")]
        [MaxLength(20, ErrorMessage = "Phone number must be at most 20 characters.")]
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Photo file — JPEG, PNG or WEBP only, max 4 MB.
        /// Only present when Content-Type is multipart/form-data.
        /// </summary>
        public IFormFile? Photo { get; set; }

        /// <summary>
        /// When true the existing profile photo is deleted and no new one is set
        /// (even if Photo is also provided, removal takes priority).
        /// </summary>
        public bool RemovePhoto { get; set; } = false;
    }
}
