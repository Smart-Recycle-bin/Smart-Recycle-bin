using Microsoft.IdentityModel.Tokens;
using SmartBin.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SmartBin.Services.Auth
{

    
        public class JwtService
        {
            private readonly IConfiguration _configuration;

            public JwtService(IConfiguration configuration)
            { 
                _configuration = configuration;
            }

            public string GenerateAccessToken(ApplicationUser user, string role)
            {
                var jwtSettings = _configuration.GetSection("Jwt");

                var key = jwtSettings["Key"]!;
                var issuer = jwtSettings["Issuer"];
                var audience = jwtSettings["Audience"];

                var expiresInMinutes = GetAccessTokenExpiresInMinutes();

                var claims = new List<Claim>
            {
                new Claim("id", user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("role", role),
                new Claim(ClaimTypes.Role, role),
                new Claim("email", user.Email ?? string.Empty),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim("name", user.DisplayName ?? string.Empty),
                new Claim(ClaimTypes.Name, user.DisplayName ?? string.Empty),
                new Claim(
                    JwtRegisteredClaimNames.Jti,
                    Guid.NewGuid().ToString()
                )
            };

                var securityKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes(key)
                );

                var credentials = new SigningCredentials(
                    securityKey,
                    SecurityAlgorithms.HmacSha256
                );

                var token = new JwtSecurityToken(
                    issuer: issuer,
                    audience: audience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(expiresInMinutes),
                    signingCredentials: credentials
                );

                return new JwtSecurityTokenHandler().WriteToken(token);
            }

            public int GetAccessTokenExpiresInSeconds()
            {
                return GetAccessTokenExpiresInMinutes() * 60;
            }

            public int GetRefreshTokenExpiresInDays()
            {
                if (!int.TryParse(_configuration["Jwt:RefreshTokenExpiresInDays"], out var days) || days <= 0)
                {
                    throw new InvalidOperationException(
                        "Configuration key 'Jwt:RefreshTokenExpiresInDays' must be a positive integer.");
                }

                return days;
            }

            private int GetAccessTokenExpiresInMinutes()
            {
                if (!int.TryParse(_configuration["Jwt:ExpiresInMinutes"], out var minutes) || minutes <= 0)
                {
                    throw new InvalidOperationException(
                        "Configuration key 'Jwt:ExpiresInMinutes' must be a positive integer.");
                }

                return minutes;
            }
        }
    }


