using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddBadgeDefinitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BADGE_DEFINITION",
                columns: table => new
                {
                    BadgeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    RequiredPoints = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "trophy"),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BADGE_DEFINITION", x => x.BadgeId);
                });

            migrationBuilder.InsertData(
                table: "BADGE_DEFINITION",
                columns: new[] { "BadgeId", "Description", "DisplayOrder", "Icon", "IsActive", "Name", "RequiredPoints" },
                values: new object[,]
                {
                    { 1, "500 pts · First 500 lifetime points", 1, "trophy", true, "Seedling", 500 },
                    { 2, "2,000 pts · Reach 2,000 lifetime points", 2, "trophy", true, "Green Starter", 2000 },
                    { 3, "5,000 pts · Reach 5,000 lifetime points", 3, "shield", true, "Eco Warrior", 5000 },
                    { 4, "10,000 pts · Reach 10,000 lifetime points", 4, "trophy", true, "Nile Guardian", 10000 },
                    { 5, "25,000 pts · Reach 25,000 lifetime points", 5, "sparkles", true, "Planet Hero", 25000 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_BADGE_DEFINITION_Name",
                table: "BADGE_DEFINITION",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BADGE_DEFINITION");
        }
    }
}
