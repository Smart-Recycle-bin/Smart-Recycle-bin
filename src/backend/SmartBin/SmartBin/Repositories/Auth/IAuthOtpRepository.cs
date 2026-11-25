using SmartBin.Models;

namespace SmartBin.Repositories.Auth
{
    public interface IAuthOtpRepository
    {
        Task AddAsync(AuthOtp otp, CancellationToken cancellationToken = default);
        Task<AuthOtp?> GetLatestOtpAsync(int userId, string purpose, CancellationToken cancellationToken = default);
        Task<AuthOtp?> GetLatestActiveOtpAsync(int userId, string purpose, CancellationToken cancellationToken = default);
        Task<List<AuthOtp>> GetActiveOtpsAsync(int userId, string purpose, CancellationToken cancellationToken = default);
        Task<int> CountRecentOtpsAsync(int userId, string purpose, DateTime since, CancellationToken cancellationToken = default);
        Task InvalidateOtherActiveOtpsAsync(int userId, string purpose, int excludeOtpId, DateTime invalidatedAt, CancellationToken cancellationToken = default);
        void Update(AuthOtp otp);
    }
}
