using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class VoucherConfiguration : IEntityTypeConfiguration<Voucher>
    {
        public void Configure(EntityTypeBuilder<Voucher> builder)
        {
            builder.ToTable("VOUCHER");
            builder.HasKey(v => v.VoucherId);

            builder.Property(v => v.ValueEgpAtRedemption).HasColumnType("decimal(18,2)");
            builder.HasIndex(v => v.Code).IsUnique();
            builder.HasIndex(v => v.RedemptionId).IsUnique();
            builder.HasIndex(v => new { v.UserId, v.RedeemedAt });

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