using SmartBin.Models;

namespace SmartBin.Repositories.Auth
{
    public interface IRefreshTokenRepository
    {
        Task AddAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
        Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
        Task UpdateAsync(RefreshToken refreshToken, CancellationToken cancellationToken = default);
        void Update(RefreshToken refreshToken);
        Task RevokeFamilyAsync(string tokenHash, int userId, CancellationToken cancellationToken = default);
        Task RevokeAllUserTokensAsync(int userId, CancellationToken cancellationToken = default);
    }
}
