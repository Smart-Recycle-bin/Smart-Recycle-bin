namespace SmartBin.Services.Surveys
{
    public class UnavailableMember5InspectionService : IMember5InspectionService
    {
        public Task<List<int>> CreateInspectionReportsAsync(
            CreateInspectionReportsRequestDto request,
            CancellationToken cancellationToken = default)
        {
            throw new ApiException(
                StatusCodes.Status503ServiceUnavailable,
                "INTEGRATION_UNAVAILABLE",
                "Inspection report service (Member 5) is not yet available.");
        }

        public Task<List<SessionInspectionReportStatusDto>> GetSessionReportsAsync(
            int sessionId,
            CancellationToken cancellationToken = default)
        {
            throw new ApiException(
                StatusCodes.Status503ServiceUnavailable,
                "INTEGRATION_UNAVAILABLE",
                "Inspection report service (Member 5) is not yet available.");
        }
    }
}
