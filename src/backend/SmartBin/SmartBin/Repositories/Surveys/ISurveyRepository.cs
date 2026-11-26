using SmartBin.DTOs.Surveys;
using SmartBin.Models;

namespace SmartBin.Repositories.Surveys
{
    public interface ISurveyRepository
    {
        Task<DisposalSurvey?> GetBySessionIdAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<DisposalSurvey?> GetByIdAsync(int surveyId, CancellationToken cancellationToken = default);
        Task<DisposalSurvey> EnsureSurveyCreatedAsync(int sessionId, DateTime createdAt, CancellationToken cancellationToken = default);
        Task<bool> ConfirmSurveyAndSessionAsync(int surveyId, int sessionId, int totalPoints, DateTime submittedAt, CancellationToken cancellationToken = default);
        Task<(List<MySurveyItemDto> Items, int TotalItems, int PendingPoints)> GetMySurveysPagedAsync(int userId, string? status, int page, int pageSize, CancellationToken cancellationToken = default);
        Task<SurveyDetailResponseDto?> GetSurveyDetailsDtoAsync(int userId, int surveyId, CancellationToken cancellationToken = default);
        Task<int> GetTotalItemPointsAsync(int sessionId, CancellationToken cancellationToken = default);
        Task<DisposalSurvey?> GetSurveyWithResponsesAsync(int surveyId, CancellationToken cancellationToken = default);
        Task<bool> SubmitCorrectionsAsync(int surveyId, DateTime submittedAt, List<SurveyResponse> responses, CancellationToken cancellationToken = default);
        Task<bool> FinalizeSessionPointsAsync(int sessionId, int totalFinalPoints, CancellationToken cancellationToken = default);
    }
}
