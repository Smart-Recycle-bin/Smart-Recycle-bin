using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartBin.Models;

namespace SmartBin.Context
{
    public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, int>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Wallet> Wallets { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<AuthOtp> AuthOtps { get; set; }
        public DbSet<SmartBin.Models.SmartBin> SmartBins { get; set; }
        public DbSet<WasteType> WasteTypes { get; set; }
        public DbSet<DisposalItem> DisposalItems { get; set; }
        public DbSet<ServiceRecord> ServiceRecords { get; set; }
        public DbSet<RewardCategory> RewardCategories { get; set; }
        public DbSet<Reward> Rewards { get; set; }
        public DbSet<DisposalSession> DisposalSessions { get; set; }
        public DbSet<DisposalSurvey> DisposalSurveys { get; set; }
        public DbSet<SurveyResponse> SurveyResponses { get; set; }
        public DbSet<LedgerTransaction> LedgerTransactions { get; set; }
        public DbSet<LedgerAdjustmentIdempotency> LedgerAdjustmentIdempotencies { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<AdminNotification> AdminNotifications { get; set; }
        public DbSet<InspectionReport> InspectionReports { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);
            builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}
