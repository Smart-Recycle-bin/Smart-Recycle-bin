using depi_project.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace EcoBin.Api;

// The team's shared DbContext will replace this one. Copy the "Member 5" lines into it.
public class EcoBinDbContext(DbContextOptions<EcoBinDbContext> options) : DbContext(options)
{
    // Member 5
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<InspectionReport> InspectionReports => Set<InspectionReport>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationRecipient> NotificationRecipients => Set<NotificationRecipient>();

    // Others (read only here)
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Reward> Rewards => Set<Reward>();
    public DbSet<RewardCategory> RewardCategories => Set<RewardCategory>();
    public DbSet<WasteType> WasteTypes => Set<WasteType>();
    public DbSet<DisposalSession> DisposalSessions => Set<DisposalSession>();
    public DbSet<DisposalSurvey> DisposalSurveys => Set<DisposalSurvey>();
    public DbSet<DisposalItem> DisposalItems => Set<DisposalItem>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        // Member 5 tables
        mb.Entity<Voucher>(b =>
        {
            b.ToTable("VOUCHER");
            b.HasKey(v => v.VoucherId);
            b.Property(v => v.ValueEgpAtRedemption).HasColumnType("decimal(18,2)");
            b.HasIndex(v => v.Code).IsUnique();
            b.HasIndex(v => v.RedemptionId).IsUnique();

            b.HasOne<User>().WithMany().HasForeignKey(v => v.UserId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(v => v.Reward).WithMany().HasForeignKey(v => v.RewardId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<InspectionReport>(b =>
        {
            b.ToTable("INSPECTION_REPORT");
            b.HasKey(r => r.ReportId);
            b.HasIndex(r => r.DisposalItemId).IsUnique();

            b.HasOne<DisposalSurvey>().WithMany().HasForeignKey(r => r.SurveyId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne<DisposalItem>().WithMany().HasForeignKey(r => r.DisposalItemId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne<User>().WithMany().HasForeignKey(r => r.ReviewedByAdminId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne<WasteType>().WithMany().HasForeignKey(r => r.CorrectedWasteTypeId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<AuditLog>(b =>
        {
            b.ToTable("AUDIT_LOG");
            b.HasKey(a => a.AuditLogId);
            b.HasOne<User>().WithMany().HasForeignKey(a => a.AdminId).OnDelete(DeleteBehavior.Restrict);
        });

        mb.Entity<Notification>(b =>
        {
            b.ToTable("NOTIFICATION");
            b.HasKey(n => n.NotificationId);
        });

        mb.Entity<NotificationRecipient>(b =>
        {
            b.ToTable("NOTIFICATION_RECIPIENT");
            b.HasKey(r => new { r.NotificationId, r.UserId });
            b.HasOne(r => r.Notification).WithMany(n => n.Recipients).HasForeignKey(r => r.NotificationId).OnDelete(DeleteBehavior.Cascade);
            b.HasOne<User>().WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Other members' tables (only names/keys that EF can't guess)
        mb.Entity<User>().ToTable("USER");
        mb.Entity<Role>().ToTable("ROLE");
        mb.Entity<RewardCategory>(b => { b.ToTable("REWARD_CATEGORY"); b.HasKey(c => c.CategoryId); });
        mb.Entity<Reward>(b => { b.ToTable("REWARD"); b.Property(r => r.ImageUrl).HasColumnName("ImageURL"); });
        mb.Entity<WasteType>().ToTable("WASTE_TYPE");
        mb.Entity<DisposalSession>(b => { b.ToTable("DISPOSAL_SESSION"); b.HasKey(s => s.SessionId); });
        mb.Entity<DisposalSurvey>(b => { b.ToTable("DISPOSAL_SURVEY"); b.HasKey(s => s.SurveyId); });
        mb.Entity<DisposalItem>(b =>
        {
            b.ToTable("DISPOSAL_ITEM");
            b.HasKey(i => i.ItemId);
            b.Property(i => i.AiConfidence).HasColumnName("AIConfidence").HasColumnType("decimal(5,4)");
        });
    }
}