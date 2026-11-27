using System.Security.Cryptography;
using System.Text;

namespace SmartBin.Services.Auth
{
    public class OtpService
    {
        private readonly IConfiguration _configuration;

        public OtpService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public bool IsConfigured()
        {
            var secret = _configuration["Otp:HashKey"];
            return !string.IsNullOrWhiteSpace(secret) && secret.Length >= 32;
        }

        private byte[] GetSecretKey()
        {
            var secret = _configuration["Otp:HashKey"];

            if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
            {
                throw new InvalidOperationException(
                    "OTP hash key must contain at least 32 characters."
                );
            }

            return Encoding.UTF8.GetBytes(secret);
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

            byte[] hash = HMACSHA256.HashData(GetSecretKey(), data);

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
