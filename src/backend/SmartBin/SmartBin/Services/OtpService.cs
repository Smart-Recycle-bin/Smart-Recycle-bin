
using System.Security.Cryptography;
using System.Text;

namespace SmartBin.Services
{
    public class OtpService
    {
        private readonly byte[] _secretKey;

        public OtpService(IConfiguration configuration)
        {
            var secret = configuration["Otp:HashKey"];

            if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
            {
                throw new InvalidOperationException(
                    "OTP hash key must contain at least 32 characters."
                );
            }

            _secretKey = Encoding.UTF8.GetBytes(secret);
        }

        public string GenerateOtp()
        {
            int number = RandomNumberGenerator.GetInt32(0, 100000);

            return number.ToString("D5");
        }

        public string HashOtp(int userId, string purpose, string otp)
        {
            string value = $"{userId}:{purpose}:{otp}";

            byte[] data = Encoding.UTF8.GetBytes(value);

            byte[] hash = HMACSHA256.HashData(_secretKey, data);

            return Convert.ToHexString(hash);
        }

        public bool VerifyOtp(
            int userId,
            string purpose,
            string otp,
            string storedHash)
        {
            string enteredHash = HashOtp(userId, purpose, otp);

            byte[] enteredBytes = Convert.FromHexString(enteredHash);
            byte[] storedBytes = Convert.FromHexString(storedHash);

            return CryptographicOperations.FixedTimeEquals(
                enteredBytes,
                storedBytes
            );
        }
    }
}
