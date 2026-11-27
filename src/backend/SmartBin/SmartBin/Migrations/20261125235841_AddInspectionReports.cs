using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddInspectionReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "INSPECTION_REPORT",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemId = table.Column<int>(type: "int", nullable: false),
                    SurveyId = table.Column<int>(type: "int", nullable: false),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    BinId = table.Column<int>(type: "int", nullable: false),
                    PredictedWasteTypeId = table.Column<int>(type: "int", nullable: false),
                    UserSelectedWasteTypeId = table.Column<int>(type: "int", nullable: false),
                    PredictedConfidence = table.Column<decimal>(type: "decimal(5,4)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    AiRating = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "pending"),
                    ReviewDecision = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ConfirmedWasteTypeId = table.Column<int>(type: "int", nullable: true),
                    AdminJustification = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReviewedByAdminId = table.Column<int>(type: "int", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RetrainingStatus = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "not_sent"),
                    RetrainingRequestedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RetrainingRequestedByAdminId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_INSPECTION_REPORT", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_DISPOSAL_ITEM_ItemId",
                        column: x => x.ItemId,
                        principalTable: "DISPOSAL_ITEM",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_DISPOSAL_SESSION_SessionId",
                        column: x => x.SessionId,
                        principalTable: "DISPOSAL_SESSION",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_DISPOSAL_SURVEY_SurveyId",
                        column: x => x.SurveyId,
                        principalTable: "DISPOSAL_SURVEY",
                        principalColumn: "SurveyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_SMART_BIN_BinId",
                        column: x => x.BinId,
                        principalTable: "SMART_BIN",
                        principalColumn: "BinId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_WASTE_TYPE_ConfirmedWasteTypeId",
                        column: x => x.ConfirmedWasteTypeId,
                        principalTable: "WASTE_TYPE",
                        principalColumn: "WasteTypeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_WASTE_TYPE_PredictedWasteTypeId",
                        column: x => x.PredictedWasteTypeId,
                        principalTable: "WASTE_TYPE",
                        principalColumn: "WasteTypeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_WASTE_TYPE_UserSelectedWasteTypeId",
                        column: x => x.UserSelectedWasteTypeId,
                        principalTable: "WASTE_TYPE",
                        principalColumn: "WasteTypeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_BinId",
                table: "INSPECTION_REPORT",
                column: "BinId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_ConfirmedWasteTypeId",
                table: "INSPECTION_REPORT",
                column: "ConfirmedWasteTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_ItemId",
                table: "INSPECTION_REPORT",
                column: "ItemId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_PredictedWasteTypeId",
                table: "INSPECTION_REPORT",
                column: "PredictedWasteTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_SessionId",
                table: "INSPECTION_REPORT",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_Status_CreatedAt",
                table: "INSPECTION_REPORT",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_SurveyId",
                table: "INSPECTION_REPORT",
                column: "SurveyId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_UserId",
                table: "INSPECTION_REPORT",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_UserSelectedWasteTypeId",
                table: "INSPECTION_REPORT",
                column: "UserSelectedWasteTypeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "INSPECTION_REPORT");
        }
    }
}
