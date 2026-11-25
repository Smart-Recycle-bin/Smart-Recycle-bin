using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Configurations
{
    public class DisposalSurveyConfiguration : IEntityTypeConfiguration<DisposalSurvey>
    {
        public void Configure(EntityTypeBuilder<DisposalSurvey> builder)
        {
            builder.ToTable("DISPOSAL_SURVEY");
            builder.HasKey(ds => ds.SurveyId);

            builder.Property(ds => ds.TotalCalculatedPoints).IsRequired().HasDefaultValue(0);
            builder.Property(ds => ds.CreatedAt).IsRequired();
            builder.Property(ds => ds.Status).IsRequired().HasMaxLength(20).HasDefaultValue(SurveyStatus.Waiting);
            builder.Property(ds => ds.Outcome).HasMaxLength(40);

            builder.HasIndex(ds => ds.SessionId).IsUnique();
            builder.HasIndex(ds => ds.Status);

            builder.HasOne(ds => ds.Session)
                .WithOne(s => s.Survey)
                .HasForeignKey<DisposalSurvey>(ds => ds.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class SurveyResponseConfiguration : IEntityTypeConfiguration<SurveyResponse>
    {
        public void Configure(EntityTypeBuilder<SurveyResponse> builder)
        {
            builder.ToTable("SURVEY_RESPONSE");
            builder.HasKey(sr => sr.ResponseId);

            builder.Property(sr => sr.IsCorrect).IsRequired();
            builder.Property(sr => sr.CreatedAt).IsRequired();

            builder.HasIndex(sr => sr.ItemId).IsUnique();
            builder.HasIndex(sr => sr.SurveyId);

            builder.HasOne(sr => sr.Survey)
                .WithMany(ds => ds.Responses)
                .HasForeignKey(sr => sr.SurveyId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(sr => sr.Item)
                .WithOne()
                .HasForeignKey<SurveyResponse>(sr => sr.ItemId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(sr => sr.UserSelectedType)
                .WithMany()
                .HasForeignKey(sr => sr.UserSelectedTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
