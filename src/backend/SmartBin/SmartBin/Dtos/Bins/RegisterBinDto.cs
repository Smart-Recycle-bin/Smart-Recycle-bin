using System.ComponentModel.DataAnnotations;

namespace SmartBin.Dtos.Bins
{
    public class RegisterBinRequestDto
    {
        [Required(ErrorMessage = "deviceSerial is required.")]
        [MaxLength(100, ErrorMessage = "deviceSerial must not exceed 100 characters.")]
        public string DeviceSerial { get; set; } = string.Empty;

        [MaxLength(150, ErrorMessage = "name must not exceed 150 characters.")]
        public string? Name { get; set; }

        [MaxLength(150, ErrorMessage = "area must not exceed 150 characters.")]
        public string? Area { get; set; }

        [MaxLength(150, ErrorMessage = "district must not exceed 150 characters.")]
        public string? District { get; set; }

        [MaxLength(150, ErrorMessage = "districtArea must not exceed 150 characters.")]
        public string? DistrictArea { get; set; }

        [Required(ErrorMessage = "latitude is required.")]
        [Range(-90.0, 90.0, ErrorMessage = "Must be between -90 and 90.")]
        public decimal? Latitude { get; set; }

        [Required(ErrorMessage = "longitude is required.")]
        [Range(-180.0, 180.0, ErrorMessage = "Must be between -180 and 180.")]
        public decimal? Longitude { get; set; }

        [Required(ErrorMessage = "capacityThresholdKg is required.")]
        [Range(0.1, 10000.0, ErrorMessage = "capacityThresholdKg must be greater than 0.")]
        public decimal? CapacityThresholdKg { get; set; }
    }

    public class RegisterBinResponseDto
    {
        public int BinId { get; set; }
        public string DeviceSerial { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? Area { get; set; }
        public string? District { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal FillLevel { get; set; }
    }
}
