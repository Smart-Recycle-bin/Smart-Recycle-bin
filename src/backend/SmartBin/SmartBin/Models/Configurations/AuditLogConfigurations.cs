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
            builder.HasKey(a => a.AuditLogId);

            builder.HasIndex(a => new { a.ResourceType, a.ResourceId });
            builder.HasIndex(a => a.Timestamp);

            builder.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(a => a.AdminId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}