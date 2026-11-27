using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            builder.ToTable("AUDIT_LOG");
            builder.HasKey(a => a.AuditId);

            builder.Property(a => a.AdminName).IsRequired().HasMaxLength(150);
            builder.Property(a => a.ActionType).IsRequired().HasMaxLength(50);
            builder.Property(a => a.ResourceType).IsRequired().HasMaxLength(50);
            builder.Property(a => a.ResourceId).IsRequired().HasMaxLength(64);
            builder.Property(a => a.Justification).IsRequired().HasMaxLength(1000);
            builder.Property(a => a.IpAddress).IsRequired().HasMaxLength(64);
            builder.Property(a => a.CreatedAt).IsRequired();

            builder.HasIndex(a => a.CreatedAt);
            builder.HasIndex(a => new { a.AdminId, a.CreatedAt });
            builder.HasIndex(a => new { a.ActionType, a.CreatedAt });
            builder.HasIndex(a => new { a.ResourceType, a.ResourceId });
            builder.HasIndex(a => a.ResourceId);

            builder.HasOne(a => a.Admin)
                .WithMany()
                .HasForeignKey(a => a.AdminId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
