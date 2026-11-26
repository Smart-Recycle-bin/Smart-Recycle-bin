using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class IdentityUserRoleConfiguration : IEntityTypeConfiguration<IdentityUserRole<int>>
    {
        public void Configure(EntityTypeBuilder<IdentityUserRole<int>> builder)
        {
            builder.HasIndex(ur => ur.UserId)
                .IsUnique();
        }
    }

    public class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
    {
        public void Configure(EntityTypeBuilder<RefreshToken> builder)
        {
            builder.HasKey(rt => rt.RefreshTokenId);

            builder.HasIndex(rt => rt.TokenHash)
                .IsUnique();

            builder.HasOne(rt => rt.User)
                .WithMany()
                .HasForeignKey(rt => rt.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(rt => rt.ReplacedByToken)
                .WithOne()
                .HasForeignKey<RefreshToken>(rt => rt.ReplacedByTokenId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class AuthOtpConfiguration : IEntityTypeConfiguration<AuthOtp>
    {
        public void Configure(EntityTypeBuilder<AuthOtp> builder)
        {
            builder.HasKey(otp => otp.OtpId);

            builder.HasOne(otp => otp.User)
                .WithMany()
                .HasForeignKey(otp => otp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(otp => new { otp.UserId, otp.Purpose, otp.CreatedAt });
            builder.HasIndex(otp => otp.ExpiresAt);
        }
    }
}
