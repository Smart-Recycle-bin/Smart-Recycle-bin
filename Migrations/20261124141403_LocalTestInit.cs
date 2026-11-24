using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcoBin.Migrations
{
    /// <inheritdoc />
    public partial class LocalTestInit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DISPOSAL_ITEM",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    WasteTypeId = table.Column<int>(type: "int", nullable: false),
                    Image = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EstimatedPoints = table.Column<int>(type: "int", nullable: false),
                    AIConfidence = table.Column<decimal>(type: "decimal(5,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DISPOSAL_ITEM", x => x.ItemId);
                });

            migrationBuilder.CreateTable(
                name: "DISPOSAL_SESSION",
                columns: table => new
                {
                    SessionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    BinId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DISPOSAL_SESSION", x => x.SessionId);
                });

            migrationBuilder.CreateTable(
                name: "DISPOSAL_SURVEY",
                columns: table => new
                {
                    SurveyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DISPOSAL_SURVEY", x => x.SurveyId);
                });

            migrationBuilder.CreateTable(
                name: "NOTIFICATION",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TargetType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    ResourceId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NOTIFICATION", x => x.NotificationId);
                });

            migrationBuilder.CreateTable(
                name: "REWARD_CATEGORY",
                columns: table => new
                {
                    CategoryId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LogoUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_REWARD_CATEGORY", x => x.CategoryId);
                });

            migrationBuilder.CreateTable(
                name: "ROLE",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ROLE", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "USER",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AccountStatus = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_USER", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "WASTE_TYPE",
                columns: table => new
                {
                    WasteTypeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WASTE_TYPE", x => x.WasteTypeId);
                });

            migrationBuilder.CreateTable(
                name: "REWARD",
                columns: table => new
                {
                    RewardId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CategoryId = table.Column<int>(type: "int", nullable: false),
                    PointsCost = table.Column<int>(type: "int", nullable: false),
                    StockQuantity = table.Column<int>(type: "int", nullable: false),
                    ImageURL = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ValidFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ValidUntil = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_REWARD", x => x.RewardId);
                    table.ForeignKey(
                        name: "FK_REWARD_REWARD_CATEGORY_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "REWARD_CATEGORY",
                        principalColumn: "CategoryId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AUDIT_LOG",
                columns: table => new
                {
                    AuditLogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AdminId = table.Column<int>(type: "int", nullable: false),
                    ActionType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ResourceType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    ResourceId = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AUDIT_LOG", x => x.AuditLogId);
                    table.ForeignKey(
                        name: "FK_AUDIT_LOG_USER_AdminId",
                        column: x => x.AdminId,
                        principalTable: "USER",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NOTIFICATION_RECIPIENT",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NOTIFICATION_RECIPIENT", x => new { x.NotificationId, x.UserId });
                    table.ForeignKey(
                        name: "FK_NOTIFICATION_RECIPIENT_NOTIFICATION_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "NOTIFICATION",
                        principalColumn: "NotificationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NOTIFICATION_RECIPIENT_USER_UserId",
                        column: x => x.UserId,
                        principalTable: "USER",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "INSPECTION_REPORT",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SurveyId = table.Column<int>(type: "int", nullable: false),
                    DisposalItemId = table.Column<int>(type: "int", nullable: false),
                    Feedback = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ReviewDecision = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RetrainingStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByAdminId = table.Column<int>(type: "int", nullable: true),
                    CorrectedWasteTypeId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_INSPECTION_REPORT", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_DISPOSAL_ITEM_DisposalItemId",
                        column: x => x.DisposalItemId,
                        principalTable: "DISPOSAL_ITEM",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_DISPOSAL_SURVEY_SurveyId",
                        column: x => x.SurveyId,
                        principalTable: "DISPOSAL_SURVEY",
                        principalColumn: "SurveyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_USER_ReviewedByAdminId",
                        column: x => x.ReviewedByAdminId,
                        principalTable: "USER",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_INSPECTION_REPORT_WASTE_TYPE_CorrectedWasteTypeId",
                        column: x => x.CorrectedWasteTypeId,
                        principalTable: "WASTE_TYPE",
                        principalColumn: "WasteTypeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VOUCHER",
                columns: table => new
                {
                    VoucherId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RedemptionId = table.Column<int>(type: "int", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RewardId = table.Column<int>(type: "int", nullable: false),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RedeemedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiryDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PointsSpent = table.Column<int>(type: "int", nullable: false),
                    ValueEgpAtRedemption = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VOUCHER", x => x.VoucherId);
                    table.ForeignKey(
                        name: "FK_VOUCHER_REWARD_RewardId",
                        column: x => x.RewardId,
                        principalTable: "REWARD",
                        principalColumn: "RewardId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VOUCHER_USER_UserId",
                        column: x => x.UserId,
                        principalTable: "USER",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AUDIT_LOG_AdminId",
                table: "AUDIT_LOG",
                column: "AdminId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_CorrectedWasteTypeId",
                table: "INSPECTION_REPORT",
                column: "CorrectedWasteTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_DisposalItemId",
                table: "INSPECTION_REPORT",
                column: "DisposalItemId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_ReviewedByAdminId",
                table: "INSPECTION_REPORT",
                column: "ReviewedByAdminId");

            migrationBuilder.CreateIndex(
                name: "IX_INSPECTION_REPORT_SurveyId",
                table: "INSPECTION_REPORT",
                column: "SurveyId");

            migrationBuilder.CreateIndex(
                name: "IX_NOTIFICATION_RECIPIENT_UserId",
                table: "NOTIFICATION_RECIPIENT",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_REWARD_CategoryId",
                table: "REWARD",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_VOUCHER_Code",
                table: "VOUCHER",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VOUCHER_RedemptionId",
                table: "VOUCHER",
                column: "RedemptionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_VOUCHER_RewardId",
                table: "VOUCHER",
                column: "RewardId");

            migrationBuilder.CreateIndex(
                name: "IX_VOUCHER_UserId",
                table: "VOUCHER",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AUDIT_LOG");

            migrationBuilder.DropTable(
                name: "DISPOSAL_SESSION");

            migrationBuilder.DropTable(
                name: "INSPECTION_REPORT");

            migrationBuilder.DropTable(
                name: "NOTIFICATION_RECIPIENT");

            migrationBuilder.DropTable(
                name: "ROLE");

            migrationBuilder.DropTable(
                name: "VOUCHER");

            migrationBuilder.DropTable(
                name: "DISPOSAL_ITEM");

            migrationBuilder.DropTable(
                name: "DISPOSAL_SURVEY");

            migrationBuilder.DropTable(
                name: "WASTE_TYPE");

            migrationBuilder.DropTable(
                name: "NOTIFICATION");

            migrationBuilder.DropTable(
                name: "REWARD");

            migrationBuilder.DropTable(
                name: "USER");

            migrationBuilder.DropTable(
                name: "REWARD_CATEGORY");
        }
    }
}
