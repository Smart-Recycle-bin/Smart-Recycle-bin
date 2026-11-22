using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SmartBin.Models;  
namespace SmartBin.Context
{


    

    public class AppDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, int>
    {

        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }
        public DbSet<Wallet> Wallets { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }

        public DbSet<AuthOtp> AuthOtps { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Each user can have only one role
            builder.Entity<IdentityUserRole<int>>()
                .HasIndex(ur => ur.UserId)
                .IsUnique();

            // RefreshToken Configuration
            builder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(rt => rt.RefreshTokenId);

                entity.HasIndex(rt => rt.TokenHash)
                    .IsUnique();

                entity.HasOne(rt => rt.User)
                    .WithMany()
                    .HasForeignKey(rt => rt.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(rt => rt.ReplacedByToken)
                    .WithOne()
                    .HasForeignKey<RefreshToken>(rt => rt.ReplacedByTokenId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // AuthOtp Configuration
            builder.Entity<AuthOtp>(entity =>
            {
                entity.HasKey(otp => otp.OtpId);

                entity.HasOne(otp => otp.User)
                    .WithMany()
                    .HasForeignKey(otp => otp.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(otp => new { otp.UserId, otp.Purpose, otp.CreatedAt });

                entity.HasIndex(otp => otp.ExpiresAt);
            });

            builder.Entity<Wallet>(entity =>
            {
                entity.ToTable("WALLET");

                entity.HasKey(w => w.WalletId);

                entity.Property(w => w.WalletId)
                    .ValueGeneratedOnAdd();

                entity.Property(w => w.UserId)
                    .IsRequired();

                entity.Property(w => w.AvailablePoints)
                    .IsRequired()
                    .HasDefaultValue(0);

                entity.Property(w => w.LifetimeEarnedPoints)
                    .IsRequired()
                    .HasDefaultValue(0);

                // One user has exactly one wallet
                entity.HasIndex(w => w.UserId)
                    .IsUnique();

                entity.HasOne(w => w.User)
                    .WithOne()
                    .HasForeignKey<Wallet>(w => w.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

        }
    }

}
