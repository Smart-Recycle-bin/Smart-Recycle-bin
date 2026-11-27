using Microsoft.AspNetCore.Identity;
using SmartBin.Context.Seeding;
using SmartBin.Models;

namespace SmartBin.Context
{
    public static class DataSeeder
    {
        private static readonly string[] CoreRoles = { "USER_CITIZEN", "OPS_COLLECTOR", "SYS_ADMIN" };

        /// <summary>
        /// Ensures core Identity roles exist in all environments.
        /// Does not seed demo users or domain sample data.
        /// </summary>
        public static async Task SeedRolesAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

            foreach (var role in CoreRoles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new ApplicationRole { Name = role });
                }
            }
        }

        /// <summary>
        /// Delegates Development demo accounts and sample domain data seeding to AdminDemoDataSeeder.
        /// Never runs outside Development.
        /// </summary>
        public static async Task SeedDevelopmentDataAsync(IServiceProvider serviceProvider)
        {
            await AdminDemoDataSeeder.SeedAsync(serviceProvider);
        }
    }
}
