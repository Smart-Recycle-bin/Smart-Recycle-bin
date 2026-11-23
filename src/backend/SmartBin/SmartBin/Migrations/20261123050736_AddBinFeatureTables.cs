using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddBinFeatureTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SMART_BIN",
                columns: table => new
                {
                    BinId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SerialNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    QRCode = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    District = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    FillLevel = table.Column<decimal>(type: "decimal(5,2)", nullable: false, defaultValue: 0m),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "AVAILABLE"),
                    CapacityThreshold = table.Column<decimal>(type: "decimal(8,2)", nullable: true),
                    CollectorId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastHeartbeatAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SMART_BIN", x => x.BinId);
                    table.ForeignKey(
                        name: "FK_SMART_BIN_AspNetUsers_CollectorId",
                        column: x => x.CollectorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WASTE_TYPE",
                columns: table => new
                {
                    WasteTypeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    BasePoints = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WASTE_TYPE", x => x.WasteTypeId);
                });

            migrationBuilder.CreateTable(
                name: "SERVICE_RECORD",
                columns: table => new
                {
                    ServiceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BinId = table.Column<int>(type: "int", nullable: false),
                    CollectorId = table.Column<int>(type: "int", nullable: false),
                    ServicedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PreviousFillLevel = table.Column<decimal>(type: "decimal(5,2)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SERVICE_RECORD", x => x.ServiceId);
                    table.ForeignKey(
                        name: "FK_SERVICE_RECORD_AspNetUsers_CollectorId",
                        column: x => x.CollectorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SERVICE_RECORD_SMART_BIN_BinId",
                        column: x => x.BinId,
                        principalTable: "SMART_BIN",
                        principalColumn: "BinId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DISPOSAL_ITEM",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    WasteTypeId = table.Column<int>(type: "int", nullable: false),
                    Image = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DetectedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EstimatedPoints = table.Column<int>(type: "int", nullable: false),
                    AIConfidence = table.Column<decimal>(type: "decimal(5,4)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DISPOSAL_ITEM", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_DISPOSAL_ITEM_WASTE_TYPE_WasteTypeId",
                        column: x => x.WasteTypeId,
                        principalTable: "WASTE_TYPE",
                        principalColumn: "WasteTypeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "WASTE_TYPE",
                columns: new[] { "WasteTypeId", "BasePoints", "Description", "Name" },
                values: new object[,]
                {
                    { 1, 15, "Plastic bottles and containers", "PLASTIC" },
                    { 2, 20, "Aluminum cans and metals", "METAL" },
                    { 3, 10, "Paper and cardboard", "PAPER" },
                    { 4, 5, "Organic waste", "ORGANIC" },
                    { 5, 1, "General non-recyclable trash", "TRASH" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_DISPOSAL_ITEM_SessionId",
                table: "DISPOSAL_ITEM",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_DISPOSAL_ITEM_WasteTypeId",
                table: "DISPOSAL_ITEM",
                column: "WasteTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_SERVICE_RECORD_BinId",
                table: "SERVICE_RECORD",
                column: "BinId");

            migrationBuilder.CreateIndex(
                name: "IX_SERVICE_RECORD_CollectorId",
                table: "SERVICE_RECORD",
                column: "CollectorId");

            migrationBuilder.CreateIndex(
                name: "IX_SMART_BIN_CollectorId",
                table: "SMART_BIN",
                column: "CollectorId");

            migrationBuilder.CreateIndex(
                name: "IX_SMART_BIN_District",
                table: "SMART_BIN",
                column: "District");

            migrationBuilder.CreateIndex(
                name: "IX_SMART_BIN_QRCode",
                table: "SMART_BIN",
                column: "QRCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SMART_BIN_SerialNumber",
                table: "SMART_BIN",
                column: "SerialNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SMART_BIN_Status",
                table: "SMART_BIN",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WASTE_TYPE_Name",
                table: "WASTE_TYPE",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DISPOSAL_ITEM");

            migrationBuilder.DropTable(
                name: "SERVICE_RECORD");

            migrationBuilder.DropTable(
                name: "WASTE_TYPE");

            migrationBuilder.DropTable(
                name: "SMART_BIN");
        }
    }
}
