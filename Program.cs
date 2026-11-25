using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

namespace EcoBin.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddDbContext<EcoBinDbContext>(o =>
            o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
        builder.Services.AddControllers();
        builder.Services.AddOpenApi();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddHttpContextAccessor();

        // Swagger + Bearer Authorize button
        builder.Services.AddSwaggerGen(c =>
        {
            c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Paste your JWT token here (without 'Bearer ')"
            });
            c.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
                    },
                    Array.Empty<string>()
                }
            });
        });

        // ---- Member 5 services ----
        builder.Services.AddScoped<ICatalogService, CatalogService>();
        builder.Services.AddScoped<IVoucherService, VoucherService>();
        builder.Services.AddScoped<IInspectionService, InspectionService>();
        builder.Services.AddScoped<IAuditLogService, AuditLogService>();

        // ---- Placeholders: replace with the real services from Member 2 / Member 4 ----
        builder.Services.AddScoped<IWalletService, WalletServiceStub>();
        builder.Services.AddScoped<ISessionPointsService, SessionPointsServiceStub>();
        builder.Services.AddScoped<IRewardStockService, RewardStockServiceStub>();

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
        {
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
            };

            o.Events = new JwtBearerEvents
            {
                OnChallenge = async ctx =>
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode = 401;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsJsonAsync(
                        ApiResponse.Error("UNAUTHORIZED", "Access token is missing or invalid."));
                },
                OnForbidden = async ctx =>
                {
                    ctx.Response.StatusCode = 403;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsJsonAsync(
                        ApiResponse.Error("FORBIDDEN", "You do not have permission to access this resource."));
                }
            };
        });

        builder.Services.Configure<ApiBehaviorOptions>(o =>
            o.InvalidModelStateResponseFactory = ctx =>
            {
                var details = ctx.ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .SelectMany(kv => kv.Value!.Errors.Select(e => new { field = kv.Key, message = e.ErrorMessage }))
                    .ToList();
                return new BadRequestObjectResult(
                    ApiResponse.Error("VALIDATION_ERROR", "Validation failed.", details));
            });

        builder.Services.AddAuthorization();

        var app = builder.Build();

        app.UseMiddleware<ErrorMiddleware>();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
            app.UseSwagger();
            app.UseSwaggerUI();

            // TEMPORARY dev-only endpoint to generate test JWTs (delete before merging with Member 1)
            app.MapGet("/dev/token", (int userId, string role, IConfiguration cfg) =>
            {
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(cfg["Jwt:Key"]!));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var claims = new[]
                {
                    new Claim("sub", userId.ToString()),
                    new Claim(ClaimTypes.Role, role)
                };
                var token = new JwtSecurityToken(
                    claims: claims,
                    expires: DateTime.UtcNow.AddHours(2),
                    signingCredentials: creds);

                return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
            });
        }

        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        app.Run();
    }
}