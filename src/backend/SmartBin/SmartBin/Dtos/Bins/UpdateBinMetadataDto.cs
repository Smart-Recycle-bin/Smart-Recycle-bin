using System.ComponentModel.DataAnnotations;

namespace SmartBin.Dtos.Bins
{
    public class UpdateBinMetadataRequestDto
    {
        [Required(ErrorMessage = "latitude is required.")]
        [Range(-90.0, 90.0, ErrorMessage = "Must be between -90 and 90.")]
        public decimal Latitude { get; set; }

        [Required(ErrorMessage = "longitude is required.")]
        [Range(-180.0, 180.0, ErrorMessage = "Must be between -180 and 180.")]
        public decimal Longitude { get; set; }

        [Required(ErrorMessage = "district is required.")]
        public string District { get; set; } = string.Empty;

        [Required(ErrorMessage = "capacityThresholdKg is required.")]
        [Range(0.1, 10000.0, ErrorMessage = "capacityThresholdKg must be greater than 0.")]
        public decimal CapacityThresholdKg { get; set; }
    }

    public class UpdateBinMetadataResponseDto
    {
        public int BinId { get; set; }
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string District { get; set; } = string.Empty;
        public decimal CapacityThresholdKg { get; set; }
    }
}
