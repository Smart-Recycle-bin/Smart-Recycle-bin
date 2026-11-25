using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class RewardCategoryConfiguration : IEntityTypeConfiguration<RewardCategory>
    {
        public void Configure(EntityTypeBuilder<RewardCategory> builder)
        {
            builder.HasKey(c => c.CategoryId);

            builder.HasIndex(c => c.Name)
                .IsUnique();

            builder.Property(c => c.Name)
                .IsRequired();

            builder.Property(c => c.IsActive)
                .HasDefaultValue(true);
        }
    }

    public class RewardConfiguration : IEntityTypeConfiguration<Reward>
    {
        public void Configure(EntityTypeBuilder<Reward> builder)
        {
            builder.HasKey(r => r.RewardId);

            builder.Property(r => r.Name)
                .IsRequired();

            builder.Property(r => r.StockQuantity)
                .HasDefaultValue(0);

            builder.HasOne(r => r.Category)
                .WithMany(c => c.Rewards)
                .HasForeignKey(r => r.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
