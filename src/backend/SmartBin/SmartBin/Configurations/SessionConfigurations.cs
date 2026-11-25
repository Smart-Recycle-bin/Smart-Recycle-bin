using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Configurations
{
    public class DisposalSessionConfiguration : IEntityTypeConfiguration<DisposalSession>
    {
        public void Configure(EntityTypeBuilder<DisposalSession> builder)
        {
            builder.ToTable("DISPOSAL_SESSION");
            builder.HasKey(s => s.SessionId);

            builder.Property(s => s.StartTime).IsRequired();
            builder.Property(s => s.Status).IsRequired().HasMaxLength(30).HasDefaultValue(SessionStatus.Active);
            builder.Property(s => s.TotalPoints).IsRequired().HasDefaultValue(0);
            builder.Property(s => s.PointsStatus).IsRequired().HasMaxLength(20).HasDefaultValue(PointsStatus.Pending);

            builder.HasIndex(s => new { s.UserId, s.StartTime });
            builder.HasIndex(s => new { s.Status, s.WindowExpiresAt });

            builder.HasOne(s => s.User)
                .WithMany()
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(s => s.Bin)
                .WithMany()
                .HasForeignKey(s => s.BinId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasMany(s => s.Items)
                .WithOne()
                .HasForeignKey(di => di.SessionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class DisposalItemConfiguration : IEntityTypeConfiguration<DisposalItem>
    {
        public void Configure(EntityTypeBuilder<DisposalItem> builder)
        {
            builder.ToTable("DISPOSAL_ITEM");
            builder.HasKey(di => di.ItemId);
            builder.HasIndex(di => di.SessionId);

            builder.HasOne(di => di.WasteType)
                .WithMany(wt => wt.DisposalItems)
                .HasForeignKey(di => di.WasteTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
