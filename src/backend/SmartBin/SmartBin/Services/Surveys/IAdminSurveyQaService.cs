using SmartBin.Dtos.Common;
using SmartBin.DTOs.Surveys;

namespace SmartBin.Services.Surveys
{
    public interface IAdminSurveyQaService
    {
        Task<SurveyQaSummaryResponseDto> GetSummaryAsync(
            string? from,
            string? to,
            CancellationToken cancellationToken = default);

        Task<(List<RecentSurveyOutcomeDto> Items, PaginationMetaDto Meta)> GetRecentSurveysAsync(
            string? from,
            string? to,
            string? outcome,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default);
    }
}
