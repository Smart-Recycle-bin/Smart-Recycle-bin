using Microsoft.IdentityModel.Tokens;
using SmartBin.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SmartBin.Services
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

                var expiresInMinutes = int.Parse(
                    jwtSettings["ExpiresInMinutes"]!
                );

                var claims = new List<Claim>
            {
                new Claim("id", user.Id.ToString()),
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("role", role),
                new Claim(ClaimTypes.Role, role),
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
                var minutes = int.Parse(
                    _configuration["Jwt:ExpiresInMinutes"]!
                );

                return minutes * 60;
            }

            public int GetRefreshTokenExpiresInDays()
            {
                return int.Parse(
                    _configuration["Jwt:RefreshTokenExpiresInDays"]!
                );
            }
        }
    }


