using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ADMIN_NOTIFICATION",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TargetAdminId = table.Column<int>(type: "int", nullable: false),
                    Audience = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "info"),
                    SourceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceReferenceId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ADMIN_NOTIFICATION", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_ADMIN_NOTIFICATION_AspNetUsers_TargetAdminId",
                        column: x => x.TargetAdminId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ADMIN_NOTIFICATION_TargetAdminId_CreatedAt_NotificationId",
                table: "ADMIN_NOTIFICATION",
                columns: new[] { "TargetAdminId", "CreatedAt", "NotificationId" });

            migrationBuilder.CreateIndex(
                name: "IX_ADMIN_NOTIFICATION_TargetAdminId_IsRead",
                table: "ADMIN_NOTIFICATION",
                columns: new[] { "TargetAdminId", "IsRead" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ADMIN_NOTIFICATION");
        }
    }
}
