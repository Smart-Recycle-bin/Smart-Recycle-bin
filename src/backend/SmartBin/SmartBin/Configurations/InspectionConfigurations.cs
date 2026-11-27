using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Configurations
{
    public class InspectionReportConfiguration : IEntityTypeConfiguration<InspectionReport>
    {
        public void Configure(EntityTypeBuilder<InspectionReport> builder)
        {
            builder.ToTable("INSPECTION_REPORT");
            builder.HasKey(r => r.ReportId);

            builder.Property(r => r.Status)
                .IsRequired()
                .HasMaxLength(30)
                .HasDefaultValue(InspectionReportStatus.Pending);

            builder.Property(r => r.RetrainingStatus)
                .IsRequired()
                .HasMaxLength(30)
                .HasDefaultValue(InspectionRetrainingStatus.NotSent);

            builder.Property(r => r.CreatedAt).IsRequired();

            builder.HasIndex(r => r.ItemId).IsUnique();
            builder.HasIndex(r => new { r.Status, r.CreatedAt });
            builder.HasIndex(r => r.SessionId);
            builder.HasIndex(r => r.BinId);

            builder.HasOne(r => r.Item)
                .WithMany()
                .HasForeignKey(r => r.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Survey)
                .WithMany()
                .HasForeignKey(r => r.SurveyId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Session)
                .WithMany()
                .HasForeignKey(r => r.SessionId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.Bin)
                .WithMany()
                .HasForeignKey(r => r.BinId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.PredictedWasteType)
                .WithMany()
                .HasForeignKey(r => r.PredictedWasteTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.UserSelectedWasteType)
                .WithMany()
                .HasForeignKey(r => r.UserSelectedWasteTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(r => r.ConfirmedWasteType)
                .WithMany()
                .HasForeignKey(r => r.ConfirmedWasteTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
