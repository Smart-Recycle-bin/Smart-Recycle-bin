//using SmartBin.Dtos.Bins;

//namespace SmartBin.Services.Bins
//{
//    public interface IMember5AnalyticsService
//    {
//        Task<AdminBinSummaryDto> GetAdminBinSummaryAsync();
//    }

//    /// <summary>
//    /// Coordination service stub simulating Member 5's statistics service for E50
//    /// </summary>
//    public class Member5AnalyticsService : IMember5AnalyticsService
//    {
//        public Task<AdminBinSummaryDto> GetAdminBinSummaryAsync()
//        {
//            return Task.FromResult(new AdminBinSummaryDto
//            {
//                LabelledImages = 1285,
//                PendingReviews = 5,
//                ReviewedReports = 3,
//                ImagesUntilNextRetraining = 215,
//                NextRetrainingThreshold = 1500
//            });
//        }
//    }
//}
using SmartBin.Dtos.Bins;

namespace SmartBin.Services.Bins
{
    public interface IMember5AnalyticsService
    {
        Task<AdminBinSummaryDto> GetAdminBinSummaryAsync();
    }
}
