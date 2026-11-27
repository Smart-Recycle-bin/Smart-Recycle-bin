using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.DependencyInjection;
using SmartBin.Hubs;

namespace SmartBin
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Allow multipart uploads up to 5 MB (4 MB photo + overhead)
            builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
            {
                o.MultipartBodyLengthLimit = 5 * 1024 * 1024; // 5 MB
            });
            builder.WebHost.ConfigureKestrel(k =>
            {
                k.Limits.MaxRequestBodySize = 5 * 1024 * 1024; // 5 MB
            });

            // Configure Services via Modular Extensions
            builder.Services.AddApiControllers();
            builder.Services.AddCorsPolicy();
            builder.Services.AddPersistence(builder.Configuration);
            builder.Services.AddApplicationServices();
            builder.Services.AddJwtAuthentication(builder.Configuration);

            var app = builder.Build();

            // Apply database migrations before running seed queries.
            using (var scope = app.Services.CreateScope())
            {
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                if (context.Database.IsSqlServer())
                {
                    await context.Database.MigrateAsync();
                }
            }

            // Seed Roles, Users, Bins and Rewards
            await DataSeeder.SeedAsync(app.Services);

            // HTTP Request Pipeline
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();

            }

            app.UseCors();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<SessionHub>("/hubs/sessions");

            await app.RunAsync();
        }
    }
}
