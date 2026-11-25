namespace SmartBin.DTOs
{
    public class RedeemRewardResultDto
    {
        public string VoucherCode { get; set; } = string.Empty;
        public int PointsDeducted { get; set; }
        public int NewAvailablePoints { get; set; }
    }
}
