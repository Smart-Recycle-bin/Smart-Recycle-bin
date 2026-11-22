
using System.Net;
using System.Net.Mail;

namespace SmartBin.Services
{
    public class EmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendVerificationOtpAsync(string email, string otp)
        {
            var host = _configuration["EmailSettings:Host"];
            var port = int.Parse(_configuration["EmailSettings:Port"]!);
            var senderEmail = _configuration["EmailSettings:SenderEmail"];
            var password = _configuration["EmailSettings:Password"];

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
            message.Subject = "SmartBin - Email Verification";
            message.Body =
                $"Your verification code is {otp}. It expires in 10 minutes.";

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

