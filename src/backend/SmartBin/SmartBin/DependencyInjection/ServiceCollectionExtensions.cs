using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using SmartBin.Common;
using SmartBin.Common.Swagger;
using SmartBin.Context;
using SmartBin.Models;
using SmartBin.Repositories;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Auth;
using SmartBin.Repositories.Bins;
using SmartBin.Repositories.Sessions;
using SmartBin.Repositories.Surveys;
using SmartBin.Repositories.Wallet;
using SmartBin.Services;
using SmartBin.Services.Auth;
using SmartBin.Services.Bins;
using SmartBin.Services.Profile;
using SmartBin.Services.Sessions;
using SmartBin.Services.Surveys;
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

            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "EcoBin / SmartBin API",
                    Version = "v1",
                    Description = "Smart recycling bin backend API with JWT authentication and response examples."
                });

                options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Description = "Enter JWT Bearer token",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT"
                });

                options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Bearer", document)] = []
                });

                options.OperationFilter<SwaggerResponseExamplesOperationFilter>();
            });
            services.AddHttpContextAccessor();

            return services;
        }

        public static IServiceCollection AddCorsPolicy(this IServiceCollection services)
        {
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(policy =>
                {
                    policy.SetIsOriginAllowed(_ => true)
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

            return services;
        }

        public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
            services.AddScoped<RefreshTokenRepository>();
            services.AddScoped<IAuthOtpRepository, AuthOtpRepository>();
            services.AddScoped<IRewardRepository, RewardRepository>();
            services.AddScoped<IRewardCategoryRepository, RewardCategoryRepository>();
            services.AddScoped<IWalletRepository, WalletRepository>();
            services.AddScoped<IBinRepository, BinRepository>();
            services.AddScoped<ISessionRepository, SessionRepository>();
            services.AddScoped<ISurveyRepository, SurveyRepository>();

            return services;
        }

        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            // Storage
            services.AddScoped<IStorageService, CloudflareR2StorageService>();

            // Auth & Profile
            services.AddScoped<JwtService>();
            services.AddScoped<AuthService>();
            services.AddScoped<OtpService>();
            services.AddScoped<EmailService>();
            services.AddScoped<ProfileService>();

            // Catalog & Rewards
            services.AddScoped<IRewardService, RewardService>();
            services.AddScoped<IRewardCategoryService, RewardCategoryService>();

            // Bin Management & Device Ingestion
            services.AddScoped<IBinService, BinService>();
            services.AddScoped<IIngestionService, IngestionService>();
            services.AddScoped<ISessionCoordinationService, SessionCoordinationService>();
            services.AddSingleton<IMember5AnalyticsService, Member5AnalyticsService>();
            services.AddSingleton<IClassificationAdapter, ClassificationAdapter>();
            services.AddHostedService<BinHeartbeatSimulatorService>();

            // Sessions, Surveys, Wallet & SignalR
            services.AddSignalR();
            services.AddScoped<ISessionRealtimeNotifier, SessionRealtimeNotifier>();
            services.AddScoped<ISessionService, SessionService>();
            services.AddScoped<ISurveyService, SurveyService>();
            services.AddScoped<IWalletService, WalletService>();
            services.AddScoped<IMember5InspectionService, UnavailableMember5InspectionService>();
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
            var secretKey = jwtSettings["Key"]!;

            services.AddAuthentication(options =>
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
