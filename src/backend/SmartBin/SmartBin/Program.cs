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

            // Configure Services via Modular Extensions
            builder.Services.AddApiControllers();
            builder.Services.AddCorsPolicy();
            builder.Services.AddPersistence(builder.Configuration);
            builder.Services.AddApplicationServices();
            builder.Services.AddJwtAuthentication(builder.Configuration);

            var app = builder.Build();

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
