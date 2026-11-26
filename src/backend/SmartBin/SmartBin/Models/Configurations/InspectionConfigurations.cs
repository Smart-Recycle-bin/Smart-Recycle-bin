using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class InspectionReportConfiguration : IEntityTypeConfiguration<InspectionReport>
    {
        public void Configure(EntityTypeBuilder<InspectionReport> builder)
        {
            builder.ToTable("INSPECTION_REPORT");
            builder.HasKey(r => r.ReportId);

            builder.HasIndex(r => r.DisposalItemId).IsUnique();
            builder.HasIndex(r => r.ReviewDecision);
            builder.HasIndex(r => r.SurveyId);

            builder.HasOne<DisposalSurvey>()
                .WithMany()
                .HasForeignKey(r => r.SurveyId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<DisposalItem>()
                .WithMany()
                .HasForeignKey(r => r.DisposalItemId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(r => r.ReviewedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne<WasteType>()
                .WithMany()
                .HasForeignKey(r => r.CorrectedWasteTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}