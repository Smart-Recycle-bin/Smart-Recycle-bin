using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class SmartBinConfiguration : IEntityTypeConfiguration<SmartBin.Models.SmartBin>
    {
        public void Configure(EntityTypeBuilder<SmartBin.Models.SmartBin> builder)
        {
            builder.ToTable("SMART_BIN");
            builder.HasKey(b => b.BinId);
            builder.HasIndex(b => b.SerialNumber).IsUnique();
            builder.HasIndex(b => b.QRCode).IsUnique();
            builder.HasIndex(b => b.Status);
            builder.HasIndex(b => b.District);

            builder.Property(b => b.FillLevel)
                .HasDefaultValue(0);

            builder.Property(b => b.Status)
                .HasDefaultValue("AVAILABLE");

            builder.HasOne(b => b.Collector)
                .WithMany()
                .HasForeignKey(b => b.CollectorId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }

    public class WasteTypeConfiguration : IEntityTypeConfiguration<WasteType>
    {
        public void Configure(EntityTypeBuilder<WasteType> builder)
        {
            builder.ToTable("WASTE_TYPE");
            builder.HasKey(wt => wt.WasteTypeId);
            builder.HasIndex(wt => wt.Name).IsUnique();

            builder.HasData(
                new WasteType { WasteTypeId = 1, Name = "PLASTIC", Description = "Plastic bottles and containers", BasePoints = 15 },
                new WasteType { WasteTypeId = 2, Name = "METAL", Description = "Aluminum cans and metals", BasePoints = 20 },
                new WasteType { WasteTypeId = 3, Name = "PAPER", Description = "Paper and cardboard", BasePoints = 10 },
                new WasteType { WasteTypeId = 4, Name = "ORGANIC", Description = "Organic waste", BasePoints = 5 },
                new WasteType { WasteTypeId = 5, Name = "TRASH", Description = "General non-recyclable trash", BasePoints = 1 }
            );
        }
    }

    public class ServiceRecordConfiguration : IEntityTypeConfiguration<ServiceRecord>
    {
        public void Configure(EntityTypeBuilder<ServiceRecord> builder)
        {
            builder.ToTable("SERVICE_RECORD");
            builder.HasKey(sr => sr.ServiceId);

            builder.HasOne(sr => sr.Bin)
                .WithMany(b => b.ServiceRecords)
                .HasForeignKey(sr => sr.BinId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(sr => sr.Collector)
                .WithMany()
                .HasForeignKey(sr => sr.CollectorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
