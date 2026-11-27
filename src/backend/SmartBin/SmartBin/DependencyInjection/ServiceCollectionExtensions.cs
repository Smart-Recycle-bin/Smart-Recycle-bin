using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartBin.Common;
using SmartBin.Context;
using SmartBin.Models;
using SmartBin.Repositories;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Audit;
using SmartBin.Repositories.Auth;
using SmartBin.Repositories.Bins;
using SmartBin.Repositories.Collectors;
using SmartBin.Repositories.Gamification;
using SmartBin.Repositories.Inspections;
using SmartBin.Repositories.Lookups;
using SmartBin.Repositories.Notifications;
using SmartBin.Repositories.Sessions;
using SmartBin.Repositories.Surveys;
using SmartBin.Repositories.Users;
using SmartBin.Repositories.Wallet;
using SmartBin.Services;
using SmartBin.Services.Audit;
using SmartBin.Services.Auth;
using SmartBin.Services.Bins;
using SmartBin.Services.Collectors;
using SmartBin.Services.Gamification;
using SmartBin.Services.Inspections;
using SmartBin.Services.Lookups;
using SmartBin.Services.Notifications;
using SmartBin.Services.Profile;
using SmartBin.Services.Sessions;
using SmartBin.Services.Surveys;
using SmartBin.Services.Users;
using SmartBin.Services.Wallets;

namespace SmartBin.DependencyInjection
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddApiControllers(this IServiceCollection services)
        {
            services.AddControllers(options =>
            {
                options.Filters.Add<ApiExceptionFilter>();
            });

            services.Configure<ApiBehaviorOptions>(options =>
            {
                options.InvalidModelStateResponseFactory = context =>
                {
                    static string NormalizeFieldName(string key)
                    {
                        if (string.IsNullOrWhiteSpace(key))
                        {
                            return string.Empty;
                        }

                        var normalized = key.Trim();
                        if (normalized == "$")
                        {
                            return string.Empty;
                        }

                        if (normalized.StartsWith("$.", StringComparison.Ordinal))
                        {
                            normalized = normalized[2..];
                        }

                        var segments = normalized.Split('.', StringSplitOptions.RemoveEmptyEntries);
                        for (var i = 0; i < segments.Length; i++)
                        {
                            var segment = segments[i];
                            var bracketIndex = segment.IndexOf('[');
                            if (bracketIndex > 0)
                            {
                                var propName = JsonNamingPolicy.CamelCase.ConvertName(segment[..bracketIndex]);
                                segments[i] = string.Concat(propName, segment[bracketIndex..]);
                            }
                            else if (bracketIndex != 0)
                            {
                                segments[i] = JsonNamingPolicy.CamelCase.ConvertName(segment);
                            }
                        }

                        return string.Join('.', segments);
                    }

                    var errors = context.ModelState
                        .Where(x => x.Value?.Errors.Count > 0)
                        .SelectMany(x => x.Value!.Errors.Select(error => new
                        {
                            field = NormalizeFieldName(x.Key),
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

            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen();
            services.AddHttpContextAccessor();

            return services;
        }

        public static IServiceCollection AddCorsPolicy(this IServiceCollection services, IConfiguration configuration)
        {
            var configuredOrigins = configuration
                .GetSection("Cors:AllowedOrigins")
                .Get<string[]>()?
                .Where(origin => !string.IsNullOrWhiteSpace(origin))
                .ToArray();

            if (configuredOrigins is null || configuredOrigins.Length == 0)
            {
                var rawOrigins = configuration["Cors:AllowedOrigins"];
                if (!string.IsNullOrWhiteSpace(rawOrigins))
                {
                    configuredOrigins = rawOrigins
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                }
            }

            var allowedOrigins = (configuredOrigins ?? Array.Empty<string>())
                .Select(origin =>
                {
                    var trimmed = origin.Trim();
                    if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri) ||
                        (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
                    {
                        throw new InvalidOperationException(
                            "Invalid CORS origin configured in 'Cors:AllowedOrigins'. Origins must be explicit http:// or https:// URLs.");
                    }

                    return uri.GetLeftPart(UriPartial.Authority);
                })
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    if (allowedOrigins.Length > 0)
                    {
                        policy.WithOrigins(allowedOrigins)
                              .AllowAnyHeader()
                              .AllowAnyMethod()
                              .AllowCredentials();
                    }
                });
            });

            return services;
        }

        public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "Database connection string 'ConnectionStrings:DefaultConnection' is not configured. Configure it via .NET User Secrets locally or environment variables in deployed environments.");
            }

            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(connectionString));

            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
            services.AddScoped<RefreshTokenRepository>();
            services.AddScoped<IAuthOtpRepository, AuthOtpRepository>();
            services.AddScoped<IRewardRepository, RewardRepository>();
            services.AddScoped<IRewardCategoryRepository, RewardCategoryRepository>();
            services.AddScoped<IWalletRepository, WalletRepository>();
            services.AddScoped<IAdminLedgerRepository, AdminLedgerRepository>();
            services.AddScoped<IBinRepository, BinRepository>();
            services.AddScoped<ISessionRepository, SessionRepository>();
            services.AddScoped<ISurveyRepository, SurveyRepository>();
            services.AddScoped<IAdminSurveyQaRepository, AdminSurveyQaRepository>();
            services.AddScoped<IAdminUserRepository, AdminUserRepository>();
            services.AddScoped<IAdminCollectorRepository, AdminCollectorRepository>();
            services.AddScoped<IAdminLookupRepository, AdminLookupRepository>();
            services.AddScoped<IAdminInspectionRepository, AdminInspectionRepository>();
            services.AddScoped<IGamificationRepository, GamificationRepository>();
            services.AddScoped<IAuditLogRepository, AuditLogRepository>();
            services.AddScoped<IAdminNotificationRepository, AdminNotificationRepository>();

            return services;
        }

        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            services.AddHttpContextAccessor();

            // Storage
            services.AddScoped<IStorageService, CloudflareR2StorageService>();

            // Auth & Profile
            services.AddScoped<JwtService>();
            services.AddScoped<AuthService>();
            services.AddScoped<OtpService>();
            services.AddScoped<EmailService>();
            services.AddScoped<ProfileService>();
            services.AddScoped<IAdminUserService, AdminUserService>();
            services.AddScoped<IAdminCollectorService, AdminCollectorService>();
            services.AddScoped<IAdminLookupService, AdminLookupService>();

            // Catalog & Rewards
            services.AddScoped<IRewardService, RewardService>();
            services.AddScoped<IRewardCategoryService, RewardCategoryService>();

            // Bin Management & Device Ingestion
            services.AddScoped<IBinService, BinService>();
            services.AddScoped<IIngestionService, IngestionService>();
            services.AddScoped<ISessionCoordinationService, SessionCoordinationService>();
            services.AddSingleton<IClassificationAdapter, ClassificationAdapter>();
            services.AddHostedService<BinHeartbeatSimulatorService>();

            // Sessions, Surveys, Wallet & SignalR
            services.AddSignalR();
            services.AddScoped<ISessionRealtimeNotifier, SessionRealtimeNotifier>();
            services.AddScoped<ISessionService, SessionService>();
            services.AddScoped<ISurveyService, SurveyService>();
            services.AddScoped<IAdminSurveyQaService, AdminSurveyQaService>();
            services.AddScoped<IWalletService, WalletService>();
            services.AddScoped<IAdminLedgerService, AdminLedgerService>();
            services.AddScoped<IMember5InspectionService, LocalInspectionService>();
            services.AddScoped<IAdminInspectionService, AdminInspectionService>();
            services.AddScoped<IGamificationService, GamificationService>();
            services.AddScoped<IAuditLogService, AuditLogService>();
            services.AddScoped<IAdminNotificationService, AdminNotificationService>();
            services.AddHostedService<SessionTimeoutBackgroundService>();

            return services;
        }

        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                options.User.RequireUniqueEmail = true;
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddDefaultTokenProviders();

            var jwtSettings = configuration.GetSection("Jwt");
            var secretKey = jwtSettings["Key"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];

            if (string.IsNullOrWhiteSpace(secretKey) || Encoding.UTF8.GetByteCount(secretKey) < 32)
            {
                throw new InvalidOperationException(
                    "Configuration key 'Jwt:Key' is missing or shorter than 32 bytes. Configure it via .NET User Secrets locally or environment variables in deployed environments.");
            }

            if (string.IsNullOrWhiteSpace(issuer) || string.IsNullOrWhiteSpace(audience))
            {
                throw new InvalidOperationException(
                    "Configuration keys 'Jwt:Issuer' and 'Jwt:Audience' are required.");
            }

            if (!int.TryParse(jwtSettings["ExpiresInMinutes"], out var accessExpiresMinutes) || accessExpiresMinutes <= 0)
            {
                throw new InvalidOperationException(
                    "Configuration key 'Jwt:ExpiresInMinutes' must be a positive integer.");
            }

            if (!int.TryParse(jwtSettings["RefreshTokenExpiresInDays"], out var refreshExpiresDays) || refreshExpiresDays <= 0)
            {
                throw new InvalidOperationException(
                    "Configuration key 'Jwt:RefreshTokenExpiresInDays' must be a positive integer.");
            }

            services.AddAuthentication(options =>
            {
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultForbidScheme = JwtBearerDefaults.AuthenticationScheme;
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

                    ValidIssuer = issuer,
                    ValidAudience = audience,

                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(secretKey)
                    ),

                    ClockSkew = TimeSpan.Zero,
                    RoleClaimType = "role",
                    NameClaimType = "id"
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/hubs/sessions"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsJsonAsync(new
                        {
                            success = false,
                            error = new
                            {
                                code = "UNAUTHORIZED",
                                message = "Access token is missing or invalid."
                            }
                        });
                    },
                    OnForbidden = async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsJsonAsync(new
                        {
                            success = false,
                            error = new
                            {
                                code = "FORBIDDEN",
                                message = "You do not have permission to access this resource."
                            }
                        });
                    }
                };
            });

            return services;
        }
    }
}
