using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace SmartBin.Tests
{
    public class JwtAuthTests
    {
        [Fact]
        public void TestJwtRoleClaimMatchingWithMapInboundClaimsFalse()
        {
            var secretKey = "lz999AQmhnalOIPKF82KBMq0RUJ04c5xjyB3oXw6zKfeHxlxJIxyVNyjs8UZrDU/2Q9QzjY2dvGpZhS9+zwfAw==";
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));

            var claims = new List<Claim>
            {
                new Claim("id", "2"),
                new Claim(ClaimTypes.NameIdentifier, "2"),
                new Claim("role", "SYS_ADMIN"),
                new Claim(ClaimTypes.Role, "SYS_ADMIN"),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var creds = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: "SmartBin",
                audience: "SmartBinClients",
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(15),
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            // Handler with MapInboundClaims = false (InboundClaimTypeMap cleared) and RoleClaimType = "role"
            var handler = new JwtSecurityTokenHandler();
            handler.InboundClaimTypeMap.Clear();

            var tvp = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = "SmartBin",
                ValidAudience = "SmartBinClients",
                IssuerSigningKey = securityKey,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = "role",
                NameClaimType = "id"
            };

            var principal = handler.ValidateToken(tokenString, tvp, out _);
            Assert.True(principal.IsInRole("SYS_ADMIN"), "Token should successfully match SYS_ADMIN role");
        }
    }
}
