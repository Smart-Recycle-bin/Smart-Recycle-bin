using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartBin.Migrations
{
    /// <inheritdoc />
    public partial class AddLedgerAdjustmentIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LEDGER_ADJUSTMENT_IDEMPOTENCY",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IdempotencyKey = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    RequestHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AdminUserId = table.Column<int>(type: "int", nullable: false),
                    TransactionId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LEDGER_ADJUSTMENT_IDEMPOTENCY", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LEDGER_ADJUSTMENT_IDEMPOTENCY_AspNetUsers_AdminUserId",
                        column: x => x.AdminUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LEDGER_ADJUSTMENT_IDEMPOTENCY_LEDGER_TRANSACTION_TransactionId",
                        column: x => x.TransactionId,
                        principalTable: "LEDGER_TRANSACTION",
                        principalColumn: "TransactionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LEDGER_ADJUSTMENT_IDEMPOTENCY_AdminUserId",
                table: "LEDGER_ADJUSTMENT_IDEMPOTENCY",
                column: "AdminUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LEDGER_ADJUSTMENT_IDEMPOTENCY_IdempotencyKey",
                table: "LEDGER_ADJUSTMENT_IDEMPOTENCY",
                column: "IdempotencyKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LEDGER_ADJUSTMENT_IDEMPOTENCY_TransactionId",
                table: "LEDGER_ADJUSTMENT_IDEMPOTENCY",
                column: "TransactionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LEDGER_ADJUSTMENT_IDEMPOTENCY");
        }
    }
}
