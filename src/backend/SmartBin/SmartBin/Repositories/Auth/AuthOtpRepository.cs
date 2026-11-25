using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;

namespace SmartBin.Repositories.Auth
{
    public class AuthOtpRepository : IAuthOtpRepository
    {
        private readonly AppDbContext _context;

        public AuthOtpRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(AuthOtp otp, CancellationToken cancellationToken = default)
        {
            await _context.AuthOtps.AddAsync(otp, cancellationToken);
        }

        public async Task<AuthOtp?> GetLatestOtpAsync(int userId, string purpose, CancellationToken cancellationToken = default)
        {
            return await _context.AuthOtps
                .Where(otp => otp.UserId == userId && otp.Purpose == purpose)
                .OrderByDescending(otp => otp.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<AuthOtp?> GetLatestActiveOtpAsync(int userId, string purpose, CancellationToken cancellationToken = default)
        {
            return await _context.AuthOtps
                .Where(otp =>
                    otp.UserId == userId &&
                    otp.Purpose == purpose &&
                    otp.ConsumedAt == null &&
                    otp.InvalidatedAt == null)
                .OrderByDescending(otp => otp.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        public async Task<List<AuthOtp>> GetActiveOtpsAsync(int userId, string purpose, CancellationToken cancellationToken = default)
        {
            return await _context.AuthOtps
                .Where(otp => otp.UserId == userId &&
                              otp.Purpose == purpose &&
                              otp.ConsumedAt == null &&
                              otp.InvalidatedAt == null)
                .ToListAsync(cancellationToken);
        }

        public async Task<int> CountRecentOtpsAsync(int userId, string purpose, DateTime since, CancellationToken cancellationToken = default)
        {
            return await _context.AuthOtps
                .CountAsync(otp => otp.UserId == userId &&
                                   otp.Purpose == purpose &&
                                   otp.CreatedAt >= since, cancellationToken);
        }

        public async Task InvalidateOtherActiveOtpsAsync(int userId, string purpose, int excludeOtpId, DateTime invalidatedAt, CancellationToken cancellationToken = default)
        {
            var otherActiveOtps = await _context.AuthOtps
                .Where(otp =>
                    otp.UserId == userId &&
                    otp.Purpose == purpose &&
                    otp.OtpId != excludeOtpId &&
                    otp.ConsumedAt == null &&
                    otp.InvalidatedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var otp in otherActiveOtps)
            {
                otp.InvalidatedAt = invalidatedAt;
            }
        }

        public void Update(AuthOtp otp)
        {
            _context.AuthOtps.Update(otp);
        }
    }
}
