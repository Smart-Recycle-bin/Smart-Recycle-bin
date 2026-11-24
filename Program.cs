using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

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
        builder.Services.AddSwaggerGen();
        builder.Services.AddHttpContextAccessor();

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

        app.UseMiddleware<ErrorMiddleware>(); // <-- Restored

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();

        app.Run();
    }
}