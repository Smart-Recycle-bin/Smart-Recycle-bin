
using Amazon.Runtime;
using Amazon.S3;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartBin.Context;
using SmartBin.Models;
using SmartBin.Repositories;
using SmartBin.Services;
using SmartBin.Services.Auth;
using SmartBin.Services.Bins;
using SmartBin.Services.Profile;
using System.Text;

namespace SmartBin
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services
            builder.Services.AddControllers();
            // Allow multipart uploads up to 5 MB (4 MB photo + overhead)
            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
            {
                o.MultipartBodyLengthLimit = 5 * 1024 * 1024; // 5 MB
            });
            builder.WebHost.ConfigureKestrel(k =>
            {
                k.Limits.MaxRequestBodySize = 5 * 1024 * 1024; // 5 MB
            });
            builder.Services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    var errors = context.ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors.Select(error => new
                        {
                            field = x.Key,
                            message = string.IsNullOrWhiteSpace(error.ErrorMessage)
                                ? "Invalid value."
                                : error.ErrorMessage
                        }))
                        .ToList();

                    return new BadRequestObjectResult(new
                    {
                        success = false,
                        error = new
                        {
                            code = "VALIDATION_ERROR",
                            message = "Invalid request data.",
                            details = errors
                        }
                    });
                }; 
            });

            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddHttpContextAccessor();
            builder.Services.AddScoped<ProfileService>();

            // Database
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(
                    builder.Configuration.GetConnectionString("DefaultConnection")
                )
            );

            // Repositories
            builder.Services.AddScoped<IRewardRepository, RewardRepository>();
            builder.Services.AddScoped<IRewardCategoryRepository, RewardCategoryRepository>();

            builder.Services.AddScoped<IRewardService, RewardService>();
            builder.Services.AddScoped<IRewardCategoryService, RewardCategoryService>();
            builder.Services.AddScoped<IStorageService, CloudflareR2StorageService>();
            // Identity
            builder.Services
               .AddIdentity<ApplicationUser, ApplicationRole>(options =>
               {
                   options.User.RequireUniqueEmail = true;
               })
               .AddEntityFrameworkStores<AppDbContext>()
               .AddDefaultTokenProviders();


            // JWT Authentication
            var jwtSettings = builder.Configuration.GetSection("Jwt");

            var secretKey = jwtSettings["Key"]!;

            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,

                    ValidIssuer = jwtSettings["Issuer"],
                    ValidAudience = jwtSettings["Audience"],

                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secretKey)
                    ),

                    ClockSkew = TimeSpan.Zero,
                    RoleClaimType = "role",
                    NameClaimType = "id"
                };
            });
            builder.Services.AddScoped<JwtService>();
            builder.Services.AddScoped<RefreshTokenRepository>();
            builder.Services.AddScoped<AuthService>();
            builder.Services.AddScoped<OtpService>();
            builder.Services.AddScoped<EmailService>();

            // Member 3: Bin Management & E21 Device Ingestion Services
            builder.Services.AddScoped<IBinService, BinService>();
            builder.Services.AddScoped<IIngestionService, IngestionService>();
            builder.Services.AddSingleton<ISessionCoordinationService, SessionCoordinationService>();
            builder.Services.AddSingleton<IMember5AnalyticsService, Member5AnalyticsService>();
            builder.Services.AddSingleton<IClassificationAdapter, ClassificationAdapter>();
            builder.Services.AddHostedService<BinHeartbeatSimulatorService>();


            



            var app = builder.Build();
            using (var scope = app.Services.CreateScope())
            {
                var roleManager = scope.ServiceProvider
                    .GetRequiredService<RoleManager<ApplicationRole>>();

                    string[] roles =
                    {
                        "USER_CITIZEN",
                        "OPS_COLLECTOR",
                        "SYS_ADMIN"
                    };

                foreach (var role in roles)
                {
                    bool roleExists = await roleManager.RoleExistsAsync(role);

                    if (!roleExists)
                    {
                        var newRole = new ApplicationRole
                        {
                            Name = role
                        };

                        var result = await roleManager.CreateAsync(newRole);

                        if (!result.Succeeded)
                        {
                            var errors = string.Join(
                                ", ",
                                result.Errors.Select(e => e.Description)
                            );

                            throw new Exception(
                                $"Failed to create role {role}: {errors}"
                            );
                        }
                    }
                }
            }

            // HTTP Request Pipeline
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            await app.RunAsync();
        }
    }
}
