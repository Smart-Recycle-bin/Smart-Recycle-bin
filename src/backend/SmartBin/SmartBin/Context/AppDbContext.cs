
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
        public DbSet<SmartBin.Models.SmartBin> SmartBins { get; set; }
        public DbSet<WasteType> WasteTypes { get; set; }
        public DbSet<DisposalItem> DisposalItems { get; set; }
        public DbSet<ServiceRecord> ServiceRecords { get; set; }

        public DbSet<RewardCategory> RewardCategories { get; set; }

        public DbSet<Reward> Rewards { get; set; }

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

            // RewardCategory Configuration
            builder.Entity<RewardCategory>(entity =>
            {
                entity.HasKey(c => c.CategoryId);

                entity.HasIndex(c => c.Name)
                    .IsUnique();

                entity.Property(c => c.Name)
                    .IsRequired();

                entity.Property(c => c.IsActive)
                    .HasDefaultValue(true);
            });

            // Reward Configuration
            builder.Entity<Reward>(entity =>
            {
                entity.HasKey(r => r.RewardId);

                entity.Property(r => r.Name)
                    .IsRequired();

                entity.Property(r => r.StockQuantity)
                    .HasDefaultValue(0);

                entity.HasOne(r => r.Category)
                    .WithMany(c => c.Rewards)
                    .HasForeignKey(r => r.CategoryId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Wallet Configuration
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
            // SMART_BIN Configuration
            builder.Entity<SmartBin.Models.SmartBin>(entity =>
            {
                entity.ToTable("SMART_BIN");
                entity.HasKey(b => b.BinId);
                entity.HasIndex(b => b.SerialNumber).IsUnique();
                entity.HasIndex(b => b.QRCode).IsUnique();
                entity.HasIndex(b => b.Status);
                entity.HasIndex(b => b.District);

                entity.Property(b => b.FillLevel)
                    .HasDefaultValue(0);

                entity.Property(b => b.Status)
                    .HasDefaultValue("AVAILABLE");

                entity.HasOne(b => b.Collector)
                    .WithMany()
                    .HasForeignKey(b => b.CollectorId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // WASTE_TYPE Configuration
            builder.Entity<WasteType>(entity =>
            {
                entity.ToTable("WASTE_TYPE");
                entity.HasKey(wt => wt.WasteTypeId);
                entity.HasIndex(wt => wt.Name).IsUnique();

                entity.HasData(
                    new WasteType { WasteTypeId = 1, Name = "PLASTIC", Description = "Plastic bottles and containers", BasePoints = 15 },
                    new WasteType { WasteTypeId = 2, Name = "METAL", Description = "Aluminum cans and metals", BasePoints = 20 },
                    new WasteType { WasteTypeId = 3, Name = "PAPER", Description = "Paper and cardboard", BasePoints = 10 },
                    new WasteType { WasteTypeId = 4, Name = "ORGANIC", Description = "Organic waste", BasePoints = 5 },
                    new WasteType { WasteTypeId = 5, Name = "TRASH", Description = "General non-recyclable trash", BasePoints = 1 }
                );
            });

            // DISPOSAL_ITEM Configuration
            builder.Entity<DisposalItem>(entity =>
            {
                entity.ToTable("DISPOSAL_ITEM");
                entity.HasKey(di => di.ItemId);
                entity.HasIndex(di => di.SessionId);

                entity.HasOne(di => di.WasteType)
                    .WithMany(wt => wt.DisposalItems)
                    .HasForeignKey(di => di.WasteTypeId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // SERVICE_RECORD Configuration
            builder.Entity<ServiceRecord>(entity =>
            {
                entity.ToTable("SERVICE_RECORD");
                entity.HasKey(sr => sr.ServiceId);

                entity.HasOne(sr => sr.Bin)
                    .WithMany(b => b.ServiceRecords)
                    .HasForeignKey(sr => sr.BinId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(sr => sr.Collector)
                    .WithMany()
                    .HasForeignKey(sr => sr.CollectorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
