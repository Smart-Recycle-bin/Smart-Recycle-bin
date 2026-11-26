using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using SmartBin.Repositories.Sessions;

namespace SmartBin.Hubs
{
    [Authorize(Roles = "USER_CITIZEN")]
    public class SessionHub : Hub
    {
        private readonly ISessionRepository _sessionRepository;

        public SessionHub(ISessionRepository sessionRepository)
        {
            _sessionRepository = sessionRepository;
        }

        public static string GetGroupName(int sessionId) => $"session:{sessionId}";

        public async Task JoinSession(int sessionId)
        {
            var userIdRaw = Context.User?.FindFirstValue("id")
                ?? Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userIdRaw, out int userId))
            {
                throw new HubException("UNAUTHORIZED: Access token is missing or invalid.");
            }

            if (sessionId <= 0)
            {
                throw new HubException("VALIDATION_ERROR: sessionId must be a positive integer.");
            }

            var session = await _sessionRepository.GetByIdAsync(sessionId, Context.ConnectionAborted);

            if (session == null)
            {
                throw new HubException("NOT_FOUND: Disposal session not found.");
            }

            if (session.UserId != userId)
            {
                throw new HubException("FORBIDDEN: You do not own this session.");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, GetGroupName(sessionId), Context.ConnectionAborted);
        }

        public async Task LeaveSession(int sessionId)
        {
            if (sessionId <= 0)
            {
                return;
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetGroupName(sessionId), Context.ConnectionAborted);
        }
    }
}
