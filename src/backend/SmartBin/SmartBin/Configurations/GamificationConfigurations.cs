using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartBin.Models;

namespace SmartBin.Configurations
{
    public class BadgeDefinitionConfiguration : IEntityTypeConfiguration<BadgeDefinition>
    {
        public void Configure(EntityTypeBuilder<BadgeDefinition> builder)
        {
            builder.ToTable("BADGE_DEFINITION");
            builder.HasKey(b => b.BadgeId);

            builder.Property(b => b.Name).IsRequired().HasMaxLength(100);
            builder.Property(b => b.Description).IsRequired().HasMaxLength(300);
            builder.Property(b => b.Icon).IsRequired().HasMaxLength(50).HasDefaultValue("trophy");
            builder.Property(b => b.IsActive).IsRequired().HasDefaultValue(true);
            builder.Property(b => b.DisplayOrder).IsRequired();

            builder.HasIndex(b => b.Name).IsUnique();

            builder.HasData(
                new BadgeDefinition
                {
                    BadgeId = 1,
                    Name = "Seedling",
                    RequiredPoints = 500,
                    Description = "500 pts · First 500 lifetime points",
                    Icon = "trophy",
                    IsActive = true,
                    DisplayOrder = 1
                },
                new BadgeDefinition
                {
                    BadgeId = 2,
                    Name = "Green Starter",
                    RequiredPoints = 2000,
                    Description = "2,000 pts · Reach 2,000 lifetime points",
                    Icon = "trophy",
                    IsActive = true,
                    DisplayOrder = 2
                },
                new BadgeDefinition
                {
                    BadgeId = 3,
                    Name = "Eco Warrior",
                    RequiredPoints = 5000,
                    Description = "5,000 pts · Reach 5,000 lifetime points",
                    Icon = "shield",
                    IsActive = true,
                    DisplayOrder = 3
                },
                new BadgeDefinition
                {
                    BadgeId = 4,
                    Name = "Nile Guardian",
                    RequiredPoints = 10000,
                    Description = "10,000 pts · Reach 10,000 lifetime points",
                    Icon = "trophy",
                    IsActive = true,
                    DisplayOrder = 4
                },
                new BadgeDefinition
                {
                    BadgeId = 5,
                    Name = "Planet Hero",
                    RequiredPoints = 25000,
                    Description = "25,000 pts · Reach 25,000 lifetime points",
                    Icon = "sparkles",
                    IsActive = true,
                    DisplayOrder = 5
                }
            );
        }
    }
}
