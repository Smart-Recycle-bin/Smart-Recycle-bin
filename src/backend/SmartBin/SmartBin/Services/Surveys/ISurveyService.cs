using SmartBin.DTOs.Surveys;

namespace SmartBin.Services.Surveys
{
    public interface ISurveyService
    {
        Task<SessionSurveyResponseDto> GetSessionSurveyAsync(
            int userId,
            int sessionId,
            CancellationToken cancellationToken = default);

        Task<ConfirmSurveyResponseDto> ConfirmSurveyAsync(
            int userId,
            int sessionId,
            CancellationToken cancellationToken = default);

        Task<(List<MySurveyItemDto> Items, SurveyPaginationMetaDto Meta)> GetMySurveysAsync(
            int userId,
            string? status,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default);

        Task<SurveyDetailResponseDto> GetSurveyDetailsAsync(
            int userId,
            int surveyId,
            CancellationToken cancellationToken = default);

        Task<SubmitSurveyCorrectionsResponseDto> SubmitCorrectionsAsync(
            int userId,
            int surveyId,
            SubmitSurveyCorrectionsRequestDto request,
            CancellationToken cancellationToken = default);

        Task FinalizeSessionPointsAsync(
            int sessionId,
            CancellationToken cancellationToken = default);
    }
}
