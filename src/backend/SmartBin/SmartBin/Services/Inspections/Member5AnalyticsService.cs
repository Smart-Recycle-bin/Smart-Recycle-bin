using SmartBin.Dtos.Bins;
using SmartBin.Repositories.Inspections;
using SmartBin.Services.Bins;

namespace SmartBin.Services.Inspections
{
    public class Member5AnalyticsService : IMember5AnalyticsService
    {
        private readonly IInspectionRepository _inspectionRepository;

        public Member5AnalyticsService(IInspectionRepository inspectionRepository)
        {
            _inspectionRepository = inspectionRepository;
        }

        public async Task<AdminBinSummaryDto> GetAdminBinSummaryAsync()
        {
            var summary = await _inspectionRepository.GetSummaryAsync();

            return new AdminBinSummaryDto
            {
                LabelledImages = summary.LabelledImages,
                PendingReviews = summary.PendingReviews,
                ReviewedReports = summary.ReviewedReports,
                ImagesUntilNextRetraining = summary.ImagesUntilNextRetraining,
                NextRetrainingThreshold = summary.NextRetrainingThreshold
            };
        }
    }
}