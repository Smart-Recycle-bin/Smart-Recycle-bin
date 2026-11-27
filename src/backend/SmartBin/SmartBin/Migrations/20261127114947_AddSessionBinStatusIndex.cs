using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionBinStatusIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DISPOSAL_SESSION_BinId",
                table: "DISPOSAL_SESSION");

            migrationBuilder.CreateIndex(
                name: "IX_DISPOSAL_SESSION_BinId_Status",
                table: "DISPOSAL_SESSION",
                columns: new[] { "BinId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DISPOSAL_SESSION_BinId_Status",
                table: "DISPOSAL_SESSION");

            migrationBuilder.CreateIndex(
                name: "IX_DISPOSAL_SESSION_BinId",
                table: "DISPOSAL_SESSION",
                column: "BinId");
        }
    }
}
