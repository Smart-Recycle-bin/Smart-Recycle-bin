using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class AdminNotificationConfiguration : IEntityTypeConfiguration<AdminNotification>
    {
        public void Configure(EntityTypeBuilder<AdminNotification> builder)
        {
            builder.ToTable("ADMIN_NOTIFICATION");
            builder.HasKey(n => n.NotificationId);

            builder.Property(n => n.Audience).IsRequired().HasMaxLength(40);
            builder.Property(n => n.Title).IsRequired().HasMaxLength(150);
            builder.Property(n => n.Message).HasMaxLength(500);
            builder.Property(n => n.Type).IsRequired().HasMaxLength(20).HasDefaultValue("info");
            builder.Property(n => n.SourceType).IsRequired().HasMaxLength(50);
            builder.Property(n => n.SourceReferenceId).HasMaxLength(64);
            builder.Property(n => n.IsRead).IsRequired().HasDefaultValue(false);
            builder.Property(n => n.CreatedAt).IsRequired();

            builder.HasIndex(n => new { n.TargetAdminId, n.CreatedAt, n.NotificationId });
            builder.HasIndex(n => new { n.TargetAdminId, n.IsRead });

            builder.HasOne(n => n.TargetAdmin)
                .WithMany()
                .HasForeignKey(n => n.TargetAdminId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
