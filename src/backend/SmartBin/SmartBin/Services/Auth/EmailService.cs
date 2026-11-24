using System.Net;
using System.Net.Mail;

namespace SmartBin.Services.Auth
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // Email verification OTP
        public async Task SendVerificationOtpAsync(
            string email,
            string otp)
        {
            await SendOtpEmailAsync(
                email,
                otp,
                "SmartBin - Email Verification",
                "Your email verification code"
            );
        }

        // Password reset OTP
        public async Task SendPasswordResetOtpAsync(
            string email,
            string otp)
        {
            await SendOtpEmailAsync(
                email,
                otp,
                "SmartBin - Password Reset",
                "Your password reset code"
            );
        }

        // Shared email sending logic
        private async Task SendOtpEmailAsync(
            string email,
            string otp,
            string subject,
            string messageText)
        {
            var host = _configuration["EmailSettings:Host"];
            if (!int.TryParse(
             _configuration["EmailSettings:Port"],
             out var port)) 
            {
                throw new InvalidOperationException(
                    "Email port is missing or invalid."
                );
            }
            var senderEmail =
                _configuration["EmailSettings:SenderEmail"];
            var password =
                _configuration["EmailSettings:Password"];

            if (string.IsNullOrWhiteSpace(host) ||
                string.IsNullOrWhiteSpace(senderEmail) ||
                string.IsNullOrWhiteSpace(password))
            {
                throw new InvalidOperationException(
                    "Email settings are not configured."
                );
            }

            using var message = new MailMessage();

            message.From = new MailAddress(senderEmail);
            message.To.Add(email);
            message.Subject = subject;
            message.Body =
                $"{messageText}: {otp}. It expires in 10 minutes.";

            using var smtpClient = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(
                    senderEmail.Trim(),
                    password.Replace(" ", "").Trim()
                ),
                EnableSsl = true,
                UseDefaultCredentials = false,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000
            };

            await smtpClient.SendMailAsync(message);
        }
    }
}
