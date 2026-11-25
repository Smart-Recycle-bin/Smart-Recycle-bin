namespace SmartBin.DTOs.Vouchers
{
    public class VoucherItemDto
    {
        public int VoucherId { get; set; }
        public int RedemptionId { get; set; }
        public string ItemTitle { get; set; } = string.Empty;
        public int PointsSpent { get; set; }
        public decimal ValueEgpAtRedemption { get; set; }
        public string VoucherCode { get; set; } = string.Empty;
        public string QrImageUrl { get; set; } = string.Empty;
        public DateTime RedeemedAt { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}