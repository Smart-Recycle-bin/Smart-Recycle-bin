using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Models;

namespace SmartBin.Repositories
{
    public class RefreshTokenRepository
    {
        private readonly AppDbContext _context;

        public RefreshTokenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(RefreshToken refreshToken)
        {
            await _context.RefreshTokens.AddAsync(refreshToken);
            await _context.SaveChangesAsync();
        }

        public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
        {
            return await _context.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash);
        }

        public async Task UpdateAsync(RefreshToken refreshToken)
        {
            _context.RefreshTokens.Update(refreshToken);
            await _context.SaveChangesAsync();
        }

        public async Task RevokeFamilyAsync(string tokenHash, int userId)
        {
            var refreshToken = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt =>
                    rt.TokenHash == tokenHash &&
                    rt.UserId == userId);

            if (refreshToken == null)
                return;

            var familyTokens = await _context.RefreshTokens
                .Where(rt =>
                    rt.FamilyId == refreshToken.FamilyId &&
                    rt.UserId == userId &&
                    rt.RevokedAt == null)
                .ToListAsync();

            foreach (var token in familyTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        public async Task RevokeAllUserTokensAsync(int userId)
        {
            var activeTokens = await _context.RefreshTokens
                .Where(token =>
                    token.UserId == userId &&
                    token.RevokedAt == null)
                .ToListAsync();

            var now = DateTime.UtcNow;

            foreach (var token in activeTokens)
            {
                token.RevokedAt = now;
            }

            await _context.SaveChangesAsync();
        }

    }
}