using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DTOs.Sessions;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Repositories.Sessions
{
    public class SessionRepository : ISessionRepository
    {
        private readonly AppDbContext _context;

        public SessionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<DisposalSession?> GetByIdAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSessions
                .Include(s => s.Items)
                    .ThenInclude(i => i.WasteType)
                .Include(s => s.Survey)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
        }

        public async Task<SessionStatusResponseDto?> GetSessionStatusDtoAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            var session = await _context.DisposalSessions
                .AsNoTracking()
                .Where(s => s.SessionId == sessionId)
                .Select(s => new
                {
                    s.SessionId,
                    s.UserId,
                    s.BinId,
                    s.Status,
                    s.WindowExpiresAt,
                    Items = s.Items
                        .OrderBy(i => i.ItemId)
                        .Select(i => new SessionItemDto
                        {
                            ItemId = i.ItemId,
                            WasteType = i.WasteType != null ? i.WasteType.Name : string.Empty,
                            EstimatedPoints = i.EstimatedPoints,
                            ImageUrl = i.Image
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (session == null)
            {
                return null;
            }

            var countdown = session.WindowExpiresAt.HasValue
                ? Math.Max(0, (int)Math.Ceiling((session.WindowExpiresAt.Value - DateTime.UtcNow).TotalSeconds))
                : 0;
            var totalPoints = session.Items.Sum(i => i.EstimatedPoints);

            return new SessionStatusResponseDto
            {
                SessionId = session.SessionId,
                BinId = session.BinId,
                BinName = $"Bin#{session.BinId:D3}",
                Status = session.Status,
                WindowExpiresAt = session.WindowExpiresAt,
                CountdownSeconds = countdown,
                TotalPoints = totalPoints,
                Items = session.Items
            };
        }

        public async Task<bool> AddAsync(DisposalSession session, CancellationToken cancellationToken = default)
        {
            await _context.DisposalSessions.AddAsync(session, cancellationToken);
            return true;
        }

        public async Task<bool> TerminateSessionIfActiveAsync(int sessionId, DateTime endTime, CancellationToken cancellationToken = default)
        {
            var updatedRows = await _context.DisposalSessions
                .Where(s => s.SessionId == sessionId && s.Status == SessionStatus.Active)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.Status, SessionStatus.Terminated)
                    .SetProperty(s => s.EndTime, endTime),
                    cancellationToken);

            return updatedRows > 0;
        }

        public async Task<List<int>> GetExpiredActiveSessionIdsAsync(DateTime threshold, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSessions
                .AsNoTracking()
                .Where(s =>
                    s.Status == SessionStatus.Active &&
                    s.WindowExpiresAt.HasValue &&
                    s.WindowExpiresAt.Value <= threshold)
                .Select(s => s.SessionId)
                .ToListAsync(cancellationToken);
        }

        public async Task<DateTime?> ExtendSessionWindowIfActiveAsync(int sessionId, int extendSeconds, CancellationToken cancellationToken = default)
        {
            var now = DateTime.UtcNow;
            var extendedExpiresAt = now.AddSeconds(extendSeconds);

            var updatedRows = await _context.DisposalSessions
                .Where(s =>
                    s.SessionId == sessionId &&
                    s.Status == SessionStatus.Active &&
                    s.WindowExpiresAt.HasValue &&
                    s.WindowExpiresAt.Value > now)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(s => s.WindowExpiresAt, extendedExpiresAt),
                    cancellationToken);

            return updatedRows > 0 ? extendedExpiresAt : null;
        }

        public async Task<bool> IsSessionActiveAsync(int sessionId, DateTime now, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSessions
                .AsNoTracking()
                .AnyAsync(s =>
                    s.SessionId == sessionId &&
                    s.Status == SessionStatus.Active &&
                    s.WindowExpiresAt.HasValue &&
                    s.WindowExpiresAt.Value > now,
                    cancellationToken);
        }

        public async Task<DisposalSession?> GetByIdWithItemsAsync(int sessionId, CancellationToken cancellationToken = default)
        {
            return await _context.DisposalSessions
                .Include(s => s.Items)
                    .ThenInclude(i => i.WasteType)
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
        }

        public async Task<ApplicationUser?> GetUserAsync(int userId, CancellationToken cancellationToken = default)
        {
            return await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        }
    }
}
