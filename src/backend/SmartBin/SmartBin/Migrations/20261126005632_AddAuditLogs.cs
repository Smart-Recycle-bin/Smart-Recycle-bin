using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AUDIT_LOG",
                columns: table => new
                {
                    AuditId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AdminId = table.Column<int>(type: "int", nullable: false),
                    AdminName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ResourceId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Justification = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AUDIT_LOG", x => x.AuditId);
                    table.ForeignKey(
                        name: "FK_AUDIT_LOG_AspNetUsers_AdminId",
                        column: x => x.AdminId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOG_ActionType_CreatedAt",
                table: "AUDIT_LOG",
                columns: new[] { "ActionType", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOG_AdminId_CreatedAt",
                table: "AUDIT_LOG",
                columns: new[] { "AdminId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOG_CreatedAt",
                table: "AUDIT_LOG",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOG_ResourceId",
                table: "AUDIT_LOG",
                column: "ResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOG_ResourceType_ResourceId",
                table: "AUDIT_LOG",
                columns: new[] { "ResourceType", "ResourceId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AUDIT_LOG");
        }
    }
}
