using SmartBin.DTOs.Surveys;

namespace SmartBin.Repositories.Surveys
{
    public interface IAdminSurveyQaRepository
    {
        Task<SurveyQaSummaryResponseDto> GetSummaryAsync(
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            CancellationToken cancellationToken = default);

        Task<(List<RecentSurveyOutcomeDto> Items, int TotalItems)> GetRecentSurveysPagedAsync(
            DateTime? fromUtc,
            DateTime? toBoundUtc,
            bool toExclusive,
            string? outcome,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
    }
}
