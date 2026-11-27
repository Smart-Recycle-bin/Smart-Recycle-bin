using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class WalletConfiguration : IEntityTypeConfiguration<Wallet>
    {
        public void Configure(EntityTypeBuilder<Wallet> builder)
        {
            builder.ToTable("WALLET");

            builder.HasKey(w => w.WalletId);

            builder.Property(w => w.WalletId)
                .ValueGeneratedOnAdd();

            builder.Property(w => w.UserId)
                .IsRequired();

            builder.Property(w => w.AvailablePoints)
                .IsRequired()
                .HasDefaultValue(0);

            builder.Property(w => w.LifetimeEarnedPoints)
                .IsRequired()
                .HasDefaultValue(0);

            // One user has exactly one wallet
            builder.HasIndex(w => w.UserId)
                .IsUnique();

            builder.HasOne(w => w.User)
                .WithOne()
                .HasForeignKey<Wallet>(w => w.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }

    public class LedgerTransactionConfiguration : IEntityTypeConfiguration<LedgerTransaction>
    {
        public void Configure(EntityTypeBuilder<LedgerTransaction> builder)
        {
            builder.ToTable("LEDGER_TRANSACTION");
            builder.HasKey(lt => lt.TransactionId);

            builder.Property(lt => lt.TransactionType).IsRequired().HasMaxLength(20);
            builder.Property(lt => lt.PointsDelta).IsRequired();
            builder.Property(lt => lt.RunningBalance).IsRequired();
            builder.Property(lt => lt.Source).IsRequired().HasMaxLength(40);
            builder.Property(lt => lt.ReasonCode).HasMaxLength(100);
            builder.Property(lt => lt.ReasonNote).HasMaxLength(500);
            builder.Property(lt => lt.CreatedAt).IsRequired();

            builder.HasIndex(lt => lt.SessionId).IsUnique();
            builder.HasIndex(lt => new { lt.WalletId, lt.CreatedAt, lt.TransactionId });

            builder.HasOne(lt => lt.Wallet)
                .WithMany()
                .HasForeignKey(lt => lt.WalletId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(lt => lt.Session)
                .WithOne(s => s.LedgerTransaction)
                .HasForeignKey<LedgerTransaction>(lt => lt.SessionId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(lt => lt.CreatedByAdmin)
                .WithMany()
                .HasForeignKey(lt => lt.CreatedByAdminId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }

    public class LedgerAdjustmentIdempotencyConfiguration : IEntityTypeConfiguration<LedgerAdjustmentIdempotency>
    {
        public void Configure(EntityTypeBuilder<LedgerAdjustmentIdempotency> builder)
        {
            builder.ToTable("LEDGER_ADJUSTMENT_IDEMPOTENCY");
            builder.HasKey(x => x.Id);

            builder.Property(x => x.IdempotencyKey).IsRequired().HasMaxLength(128);
            builder.Property(x => x.RequestHash).IsRequired().HasMaxLength(64);
            builder.Property(x => x.CreatedAt).IsRequired();

            builder.HasIndex(x => x.IdempotencyKey).IsUnique();
            builder.HasIndex(x => x.TransactionId).IsUnique();

            builder.HasOne(x => x.AdminUser)
                .WithMany()
                .HasForeignKey(x => x.AdminUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.Transaction)
                .WithMany()
                .HasForeignKey(x => x.TransactionId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
