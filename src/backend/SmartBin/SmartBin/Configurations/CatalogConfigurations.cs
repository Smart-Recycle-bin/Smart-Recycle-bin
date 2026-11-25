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

    public class UserVoucherConfiguration : IEntityTypeConfiguration<UserVoucher>
    {
        public void Configure(EntityTypeBuilder<UserVoucher> builder)
        {
            builder.HasKey(v => v.VoucherId);

            builder.Property(v => v.VoucherCode)
                .IsRequired()
                .HasMaxLength(32);

            builder.HasIndex(v => v.VoucherCode)
                .IsUnique();

            builder.HasIndex(v => new { v.UserId, v.RedeemedAt });

            builder.Property(v => v.IsUsed)
                .HasDefaultValue(false);

            builder.Property(v => v.RedeemedAt)
                .IsRequired();

            builder.HasOne(v => v.User)
                .WithMany()
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(v => v.Reward)
                .WithMany()
                .HasForeignKey(v => v.RewardId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
