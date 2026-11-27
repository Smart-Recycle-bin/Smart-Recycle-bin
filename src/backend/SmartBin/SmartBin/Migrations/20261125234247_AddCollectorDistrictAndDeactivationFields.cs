using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectorDistrictAndDeactivationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeactivatedAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DeactivatedByAdminId",
                table: "AspNetUsers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "District",
                table: "AspNetUsers",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_District",
                table: "AspNetUsers",
                column: "District");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_District",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DeactivatedAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "DeactivatedByAdminId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "District",
                table: "AspNetUsers");
        }
    }
}
