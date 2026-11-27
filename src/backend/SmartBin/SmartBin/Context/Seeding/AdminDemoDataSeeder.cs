using System.Globalization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SmartBin.Models;
using SmartBin.Models.Constants;

namespace SmartBin.Context.Seeding
{
    /// <summary>
    /// Reusable, idempotent Development-only demo data seeder covering all active Admin Web modules.
    /// Never runs outside the Development host environment.
    /// </summary>
    public static class AdminDemoDataSeeder
    {
        private const string CitizenRole = "USER_CITIZEN";
        private const string CollectorRole = "OPS_COLLECTOR";
        private const string AdminRole = "SYS_ADMIN";

        // Local Development-only demo account credentials (never used outside Development)
        private const string DemoAdminPassword = "Admin123!";
        private const string DemoCollectorPassword = "Collector123!";
        private const string DemoCitizenPassword = "Citizen123!";

        private sealed record DemoUserSpec(
            string Email,
            string DisplayName,
            string? PhoneNumber,
            string Role,
            string Password,
            string AccountStatus,
            string? District,
            DateTime CreatedAt,
            DateTime LastActiveAt,
            DateTime? DeactivatedAt = null,
            bool MarkDeactivatedByAdmin = false,
            DateTime? SuspendedAt = null,
            string? SuspensionReason = null,
            bool MarkSuspendedByAdmin = false);

        private sealed record DemoBinSpec(
            string SerialNumber,
            string Name,
            string Area,
            string QRCode,
            string District,
            decimal Latitude,
            decimal Longitude,
            string Status,
            decimal FillLevel,
            decimal CapacityThreshold,
            string? CollectorEmail,
            DateTime? AssignedAt,
            DateTime CreatedAt,
            DateTime? LastHeartbeatAt);

        private sealed record DemoLedgerEventSpec(
            DateTime CreatedAt,
            string TransactionType,
            int PointsDelta,
            string Source,
            int? SessionId = null,
            int? VoucherId = null,
            int? CreatedByAdminId = null,
            string? ReasonCode = null,
            string? ReasonNote = null);

        public static async Task SeedAsync(
            IServiceProvider serviceProvider,
            CancellationToken cancellationToken = default)
        {
            using var scope = serviceProvider.CreateScope();
            var environment = scope.ServiceProvider.GetRequiredService<IHostEnvironment>();
            if (!environment.IsDevelopment())
            {
                return;
            }

            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();

            // Ensure core roles exist safely even if SeedAsync is called directly
            foreach (var role in new[] { CitizenRole, CollectorRole, AdminRole })
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new ApplicationRole { Name = role });
                }
            }

            var now = DateTime.UtcNow;

            // 1. Seed Identity users using UserManager (never raw SQL)
            var primaryAdmin = await EnsureUserAsync(
                userManager,
                new DemoUserSpec(
                    "admin@ecobin.com",
                    "System Admin",
                    "+20 100 000 0001",
                    AdminRole,
                    DemoAdminPassword,
                    "active",
                    null,
                    now.AddDays(-120),
                    now.AddMinutes(-15)),
                actorAdminId: null);

            var secondaryAdmin = await EnsureUserAsync(
                userManager,
                new DemoUserSpec(
                    "admin2@ecobin.com",
                    "Nadia Hassan",
                    "+20 100 000 0002",
                    AdminRole,
                    DemoAdminPassword,
                    "active",
                    null,
                    now.AddDays(-90),
                    now.AddHours(-2)),
                actorAdminId: null);

            var collectors = new Dictionary<string, ApplicationUser>(StringComparer.OrdinalIgnoreCase);
            var collectorSpecs = new[]
            {
                new DemoUserSpec(
                    "collector@ecobin.com",
                    "Tarek Mansour",
                    "+201123456789",
                    CollectorRole,
                    DemoCollectorPassword,
                    "active",
                    "Downtown Cairo",
                    now.AddDays(-90),
                    now.AddHours(-1)),
                new DemoUserSpec(
                    "collector.zamalek@ecobin.com",
                    "Hany Abdelrahman",
                    "+201198765432",
                    CollectorRole,
                    DemoCollectorPassword,
                    "active",
                    "Zamalek",
                    now.AddDays(-70),
                    now.AddHours(-3)),
                new DemoUserSpec(
                    "collector.maadi@ecobin.com",
                    "Karim El-Sayed",
                    "+201155544433",
                    CollectorRole,
                    DemoCollectorPassword,
                    "active",
                    "Maadi",
                    now.AddDays(-50),
                    now.AddDays(-1)),
                new DemoUserSpec(
                    "collector.inactive@ecobin.com",
                    "Mostafa Adel",
                    "+201177788899",
                    CollectorRole,
                    DemoCollectorPassword,
                    "inactive",
                    "Nasr City",
                    now.AddDays(-85),
                    now.AddDays(-10),
                    DeactivatedAt: now.AddDays(-10),
                    MarkDeactivatedByAdmin: true)
            };

            foreach (var spec in collectorSpecs)
            {
                var user = await EnsureUserAsync(userManager, spec, primaryAdmin.Id);
                collectors[spec.Email] = user;
            }

            var citizens = new Dictionary<string, ApplicationUser>(StringComparer.OrdinalIgnoreCase);
            var citizenSpecs = new[]
            {
                new DemoUserSpec(
                    "citizen@ecobin.com",
                    "Youssef Mohamed",
                    "+201001234567",
                    CitizenRole,
                    DemoCitizenPassword,
                    "active",
                    null,
                    now.AddDays(-95),
                    now.AddHours(-2)),
                new DemoUserSpec(
                    "citizen.farida@ecobin.com",
                    "Farida Nader",
                    "+201002345678",
                    CitizenRole,
                    DemoCitizenPassword,
                    "active",
                    null,
                    now.AddDays(-75),
                    now.AddHours(-5)),
                new DemoUserSpec(
                    "citizen.sara@ecobin.com",
                    "Sara Khaled",
                    "+201003456789",
                    CitizenRole,
                    DemoCitizenPassword,
                    "active",
                    null,
                    now.AddDays(-60),
                    now.AddDays(-1)),
                new DemoUserSpec(
                    "citizen.omar@ecobin.com",
                    "Omar Tarek",
                    "+201004567890",
                    CitizenRole,
                    DemoCitizenPassword,
                    "active",
                    null,
                    now.AddDays(-40),
                    now.AddDays(-2)),
                new DemoUserSpec(
                    "citizen.salma@ecobin.com",
                    "Salma Ibrahim",
                    "+201005678901",
                    CitizenRole,
                    DemoCitizenPassword,
                    "active",
                    null,
                    now.AddDays(-20),
                    now.AddDays(-4)),
                new DemoUserSpec(
                    "citizen.suspended@ecobin.com",
                    "Khaled Mansour",
                    "+201006789012",
                    CitizenRole,
                    DemoCitizenPassword,
                    "suspended",
                    null,
                    now.AddDays(-45),
                    now.AddDays(-3),
                    SuspendedAt: now.AddDays(-3),
                    SuspensionReason: "Repeated false classification disputes across multiple sessions.",
                    MarkSuspendedByAdmin: true)
            };

            foreach (var spec in citizenSpecs)
            {
                var user = await EnsureUserAsync(userManager, spec, primaryAdmin.Id);
                citizens[spec.Email] = user;
            }

            // 2. Ensure deterministic local JPEG demo assets exist under wwwroot/uploads/demo
            var demoImages = EnsureLocalDemoImages(environment.ContentRootPath);

            // 3. Domain seeding inside an atomic database transaction
            await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);

            var wasteTypes = await context.WasteTypes
                .ToDictionaryAsync(wt => wt.Name, StringComparer.OrdinalIgnoreCase, cancellationToken);

            if (!wasteTypes.TryGetValue(WasteTypeNames.Plastic, out var plastic) ||
                !wasteTypes.TryGetValue(WasteTypeNames.Metal, out var metal) ||
                !wasteTypes.TryGetValue(WasteTypeNames.Paper, out var paper) ||
                !wasteTypes.TryGetValue(WasteTypeNames.Organic, out var organic) ||
                !wasteTypes.TryGetValue(WasteTypeNames.Trash, out var trash))
            {
                throw new InvalidOperationException("Required seeded WASTE_TYPE records are missing. Ensure EF migrations have been applied before seeding.");
            }

            // 3A. Smart Bins (10 bins across 4 districts & all 4 statuses)
            var binSpecs = new[]
            {
                new DemoBinSpec("BIN-E2E-101", "Tahrir Main Hub", "Tahrir Square", "BIN-101", "Downtown Cairo", 30.0444m, 31.2357m, SmartBinStatus.Available, 24m, 50m, "collector@ecobin.com", now.AddDays(-30), now.AddDays(-80), null),
                new DemoBinSpec("BIN-E2E-210", "Ramses Concourse Point", "Ramses Square", "BIN-210", "Downtown Cairo", 30.0626m, 31.2468m, SmartBinStatus.Full80, 84m, 50m, "collector@ecobin.com", now.AddDays(-25), now.AddDays(-75), null),
                new DemoBinSpec("BIN-E2E-420", "Zamalek Gezira North", "26th of July Axis", "BIN-420", "Zamalek", 30.0609m, 31.2197m, SmartBinStatus.Available, 42m, 55m, "collector.zamalek@ecobin.com", now.AddDays(-20), now.AddDays(-70), null),
                new DemoBinSpec("BIN-E2E-421", "Zamalek Opera Gate", "Gezira Club Entrance", "BIN-421", "Zamalek", 30.0422m, 31.2244m, SmartBinStatus.NeedsService95, 97m, 50m, "collector.zamalek@ecobin.com", now.AddDays(-18), now.AddDays(-65), null),
                new DemoBinSpec("BIN-E2E-501", "Maadi Degla Plaza", "Degla Square", "BIN-501", "Maadi", 29.9602m, 31.2684m, SmartBinStatus.NeedsService95, 96m, 60m, "collector.maadi@ecobin.com", now.AddDays(-15), now.AddDays(-60), null),
                new DemoBinSpec("BIN-E2E-502", "Maadi Corniche Walk", "Nile Corniche", "BIN-502", "Maadi", 29.9589m, 31.2512m, SmartBinStatus.Available, 18m, 50m, null, null, now.AddDays(-55), null),
                new DemoBinSpec("BIN-E2E-601", "Nasr City Stars Mall", "Citystars Gate 3", "BIN-601", "Nasr City", 30.0728m, 31.3462m, SmartBinStatus.Full80, 86m, 55m, null, null, now.AddDays(-50), null),
                new DemoBinSpec("BIN-E2E-602", "Nasr City International Park", "Abbas El-Akkad", "BIN-602", "Nasr City", 30.0561m, 31.3301m, SmartBinStatus.Offline, 64m, 50m, "collector@ecobin.com", now.AddDays(-12), now.AddDays(-45), now.AddHours(-4)),
                new DemoBinSpec("BIN-E2E-103", "Abdeen Garden Kiosk", "Abdeen Palace", "BIN-103", "Downtown Cairo", 30.0420m, 31.2480m, SmartBinStatus.Available, 15m, 45m, null, null, now.AddDays(-35), null),
                new DemoBinSpec("BIN-E2E-503", "Maadi Grand Mall", "Road 250", "BIN-503", "Maadi", 29.9690m, 31.2740m, SmartBinStatus.Offline, 91m, 50m, "collector.maadi@ecobin.com", now.AddDays(-8), now.AddDays(-30), now.AddHours(-6))
            };

            var bins = new Dictionary<string, Models.SmartBin>(StringComparer.OrdinalIgnoreCase);
            foreach (var spec in binSpecs)
            {
                var existingBin = await context.SmartBins
                    .FirstOrDefaultAsync(b => b.SerialNumber == spec.SerialNumber, cancellationToken);

                if (existingBin == null)
                {
                    int? assignedCollectorId = spec.CollectorEmail != null && collectors.TryGetValue(spec.CollectorEmail, out var col)
                        ? col.Id
                        : null;

                    existingBin = new Models.SmartBin
                    {
                        SerialNumber = spec.SerialNumber,
                        Name = spec.Name,
                        Area = spec.Area,
                        QRCode = spec.QRCode,
                        District = spec.District,
                        Latitude = spec.Latitude,
                        Longitude = spec.Longitude,
                        Status = spec.Status,
                        FillLevel = spec.FillLevel,
                        CapacityThreshold = spec.CapacityThreshold,
                        CollectorId = assignedCollectorId,
                        AssignedAt = assignedCollectorId.HasValue ? spec.AssignedAt : null,
                        CreatedAt = spec.CreatedAt,
                        LastHeartbeatAt = spec.LastHeartbeatAt
                    };
                    await context.SmartBins.AddAsync(existingBin, cancellationToken);
                    await context.SaveChangesAsync(cancellationToken);
                }

                bins[spec.SerialNumber] = existingBin;
            }

            // 3B. Service Records (idempotent via stable tag in Notes)
            await EnsureServiceRecordAsync(context, bins["BIN-E2E-101"].BinId, collectors["collector@ecobin.com"].Id, now.AddDays(-2), 88m, "[DEMO-SVC-01] Routine collection completed.", cancellationToken);
            await EnsureServiceRecordAsync(context, bins["BIN-E2E-210"].BinId, collectors["collector@ecobin.com"].Id, now.AddDays(-5), 92m, "[DEMO-SVC-02] Peak rush hour emptying.", cancellationToken);
            await EnsureServiceRecordAsync(context, bins["BIN-E2E-420"].BinId, collectors["collector.zamalek@ecobin.com"].Id, now.AddDays(-1), 79m, "[DEMO-SVC-03] Scheduled district pickup.", cancellationToken);
            await EnsureServiceRecordAsync(context, bins["BIN-E2E-501"].BinId, collectors["collector.maadi@ecobin.com"].Id, now.AddDays(-4), 95m, "[DEMO-SVC-04] Emergency overflow clearance.", cancellationToken);

            // 3C. Reward Categories & Rewards
            var catTelecom = await EnsureCategoryAsync(context, "Telecom", now.AddDays(-90), cancellationToken);
            var catSupermarket = await EnsureCategoryAsync(context, "Supermarket", now.AddDays(-90), cancellationToken);
            var catTransit = await EnsureCategoryAsync(context, "Transportation", now.AddDays(-90), cancellationToken);

            var rwdVodafone = await EnsureRewardAsync(
                context,
                catTelecom.CategoryId,
                "Vodafone Internet E£ 5 Pounds",
                "Get 500MB high-speed internet voucher redeemable via Vodafone app.",
                pointsCost: 500,
                stockQuantity: 100,
                voucherCodeType: "qr",
                imageUrl: demoImages["reward-vodafone"],
                validFrom: now.AddDays(-30),
                validUntil: now.AddDays(330),
                isActive: true,
                createdAt: now.AddDays(-60),
                cancellationToken);

            var rwdCarrefour = await EnsureRewardAsync(
                context,
                catSupermarket.CategoryId,
                "Carrefour Voucher E£ 10 Pounds",
                "Digital shopping voucher valid at all Carrefour stores across Egypt.",
                pointsCost: 1000,
                stockQuantity: 50,
                voucherCodeType: "qr",
                imageUrl: demoImages["reward-carrefour"],
                validFrom: now.AddDays(-30),
                validUntil: now.AddDays(330),
                isActive: true,
                createdAt: now.AddDays(-58),
                cancellationToken);

            var rwdMetro = await EnsureRewardAsync(
                context,
                catTransit.CategoryId,
                "Metro Free Ticket",
                "One free single-trip ticket for Cairo Metro lines 1, 2, or 3.",
                pointsCost: 200,
                stockQuantity: 200,
                voucherCodeType: "text",
                imageUrl: demoImages["reward-metro"],
                validFrom: now.AddDays(-30),
                validUntil: now.AddDays(330),
                isActive: true,
                createdAt: now.AddDays(-55),
                cancellationToken);

            var rwdSpinneys = await EnsureRewardAsync(
                context,
                catSupermarket.CategoryId,
                "Spinneys Grocery E£ 25 Voucher",
                "Grocery discount code currently awaiting restock.",
                pointsCost: 2500,
                stockQuantity: 0,
                voucherCodeType: "qr",
                imageUrl: demoImages["reward-spinneys"],
                validFrom: now.AddDays(-20),
                validUntil: now.AddDays(180),
                isActive: true,
                createdAt: now.AddDays(-40),
                cancellationToken);

            await EnsureRewardAsync(
                context,
                catTransit.CategoryId,
                "Seasonal Earth Day Bottle",
                "Promotional campaign reward archived after campaign close.",
                pointsCost: 750,
                stockQuantity: 15,
                voucherCodeType: "text",
                imageUrl: demoImages["reward-bottle"],
                validFrom: now.AddDays(-120),
                validUntil: now.AddDays(-15),
                isActive: false,
                createdAt: now.AddDays(-120),
                cancellationToken);

            // 3D. Disposal Sessions, Items, Surveys, Survey Responses & Local Inspection Reports
            var sess01 = await EnsureConfirmedSessionAsync(
                context,
                markerImageUrl: demoImages["sess-01"],
                userId: citizens["citizen@ecobin.com"].Id,
                binId: bins["BIN-E2E-101"].BinId,
                sessionTime: now.AddDays(-14),
                items: new[] { (plastic, 0.9400m), (metal, 0.9100m) },
                cancellationToken);

            var sess02 = await EnsureConfirmedSessionAsync(
                context,
                markerImageUrl: demoImages["sess-02"],
                userId: citizens["citizen.farida@ecobin.com"].Id,
                binId: bins["BIN-E2E-420"].BinId,
                sessionTime: now.AddDays(-5),
                items: new[] { (plastic, 0.8900m), (paper, 0.8600m) },
                cancellationToken);

            var sess03 = await EnsureConfirmedSessionAsync(
                context,
                markerImageUrl: demoImages["sess-03"],
                userId: citizens["citizen.sara@ecobin.com"].Id,
                binId: bins["BIN-E2E-210"].BinId,
                sessionTime: now.AddDays(-3),
                items: new[] { (metal, 0.9500m), (metal, 0.9200m) },
                cancellationToken);

            var sess04 = await EnsureConfirmedSessionAsync(
                context,
                markerImageUrl: demoImages["sess-04"],
                userId: citizens["citizen.omar@ecobin.com"].Id,
                binId: bins["BIN-E2E-502"].BinId,
                sessionTime: now.AddDays(-1),
                items: new[] { (paper, 0.8800m), (organic, 0.8200m) },
                cancellationToken);

            var sess05 = await EnsureConfirmedSessionAsync(
                context,
                markerImageUrl: demoImages["sess-05"],
                userId: citizens["citizen@ecobin.com"].Id,
                binId: bins["BIN-E2E-103"].BinId,
                sessionTime: now.AddMinutes(-30),
                items: new[] { (plastic, 0.9300m), (metal, 0.9000m) },
                cancellationToken);

            // Disputed sessions backing Survey QA & Inspection Review Queue (pending, reviewed, sent_to_retraining)
            var (sess06, rep01Id) = await EnsureDisputedSessionWithReportAsync(
                context,
                markerImageUrl: demoImages["frame-01"],
                userId: citizens["citizen.farida@ecobin.com"].Id,
                binId: bins["BIN-E2E-421"].BinId,
                sessionTime: now.AddDays(-6),
                predictedType: plastic,
                userSelectedType: metal,
                confidence: 0.6100m,
                reportStatus: InspectionReportStatus.SentToRetraining,
                reviewDecision: InspectionReviewDecision.Approved,
                confirmedType: metal,
                adminJustification: "[DEMO-REP-01] Confirmed metal can from frame lighting.",
                retrainingStatus: InspectionRetrainingStatus.Queued,
                actorAdminId: primaryAdmin.Id,
                awardPointsImmediately: true,
                cancellationToken);

            var (sess07, rep02Id) = await EnsureDisputedSessionWithReportAsync(
                context,
                markerImageUrl: demoImages["frame-02"],
                userId: citizens["citizen.sara@ecobin.com"].Id,
                binId: bins["BIN-E2E-210"].BinId,
                sessionTime: now.AddDays(-2),
                predictedType: paper,
                userSelectedType: plastic,
                confidence: 0.6750m,
                reportStatus: InspectionReportStatus.Reviewed,
                reviewDecision: InspectionReviewDecision.Approved,
                confirmedType: plastic,
                adminJustification: "[DEMO-REP-02] Clear PET bottle mislabelled as cardboard.",
                retrainingStatus: InspectionRetrainingStatus.NotSent,
                actorAdminId: primaryAdmin.Id,
                awardPointsImmediately: true,
                cancellationToken);

            var (_, rep03Id) = await EnsureDisputedSessionWithReportAsync(
                context,
                markerImageUrl: demoImages["frame-03"],
                userId: citizens["citizen.salma@ecobin.com"].Id,
                binId: bins["BIN-E2E-501"].BinId,
                sessionTime: now.AddDays(-1).AddHours(-3),
                predictedType: plastic,
                userSelectedType: paper,
                confidence: 0.5800m,
                reportStatus: InspectionReportStatus.Pending,
                reviewDecision: null,
                confirmedType: null,
                adminJustification: null,
                retrainingStatus: InspectionRetrainingStatus.NotSent,
                actorAdminId: null,
                awardPointsImmediately: false,
                cancellationToken);

            var (_, _) = await EnsureDisputedSessionWithReportAsync(
                context,
                markerImageUrl: demoImages["frame-04"],
                userId: citizens["citizen.omar@ecobin.com"].Id,
                binId: bins["BIN-E2E-601"].BinId,
                sessionTime: now.AddMinutes(-20),
                predictedType: metal,
                userSelectedType: trash,
                confidence: 0.5400m,
                reportStatus: InspectionReportStatus.Pending,
                reviewDecision: null,
                confirmedType: null,
                adminJustification: null,
                retrainingStatus: InspectionRetrainingStatus.NotSent,
                actorAdminId: null,
                awardPointsImmediately: false,
                cancellationToken);

            // 3E. Wallets & Mathematically Consistent Ledger Transactions (all 6 citizens across badge tiers)
            await EnsureCitizenWalletWithLedgerAsync(
                context,
                citizens["citizen@ecobin.com"].Id,
                new[]
                {
                    new DemoLedgerEventSpec(now.AddDays(-45), LedgerTransactionType.Credit, 25000, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "COMMUNITY_AMBASSADOR", ReasonNote: "[DEMO-TX-01] Annual community ambassador grant"),
                    new DemoLedgerEventSpec(now.AddDays(-25), LedgerTransactionType.Debit, -1000, LedgerSource.VoucherRedemption, VoucherId: rwdCarrefour.RewardId, ReasonNote: "[DEMO-TX-02] Carrefour EGP 10 voucher"),
                    new DemoLedgerEventSpec(sess01.StartTime.AddMinutes(3), LedgerTransactionType.Credit, sess01.TotalPoints, LedgerSource.SessionAward, SessionId: sess01.SessionId),
                    new DemoLedgerEventSpec(now.AddDays(-6), LedgerTransactionType.Credit, 965, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "BONUS_CAMPAIGN", ReasonNote: "[DEMO-TX-03] Green week bonus points"),
                    new DemoLedgerEventSpec(now.AddDays(-3), LedgerTransactionType.Debit, -500, LedgerSource.VoucherRedemption, VoucherId: rwdVodafone.RewardId, ReasonNote: "[DEMO-TX-04] Vodafone 500MB voucher"),
                    new DemoLedgerEventSpec(sess05.StartTime.AddMinutes(2), LedgerTransactionType.Credit, sess05.TotalPoints, LedgerSource.SessionAward, SessionId: sess05.SessionId)
                },
                cancellationToken);

            await EnsureCitizenWalletWithLedgerAsync(
                context,
                citizens["citizen.farida@ecobin.com"].Id,
                new[]
                {
                    new DemoLedgerEventSpec(now.AddDays(-40), LedgerTransactionType.Credit, 10000, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "MIGRATION_BALANCE", ReasonNote: "[DEMO-TX-05] Historical verified balance import"),
                    new DemoLedgerEventSpec(now.AddDays(-12), LedgerTransactionType.Debit, -200, LedgerSource.VoucherRedemption, VoucherId: rwdMetro.RewardId, ReasonNote: "[DEMO-TX-06] Cairo Metro ticket"),
                    new DemoLedgerEventSpec(sess06.StartTime.AddMinutes(5), LedgerTransactionType.Credit, sess06.TotalPoints, LedgerSource.SessionAward, SessionId: sess06.SessionId),
                    new DemoLedgerEventSpec(sess02.StartTime.AddMinutes(2), LedgerTransactionType.Credit, sess02.TotalPoints, LedgerSource.SessionAward, SessionId: sess02.SessionId),
                    new DemoLedgerEventSpec(now.AddDays(-1), LedgerTransactionType.Credit, 1155, LedgerSource.ManualAdjustment, CreatedByAdminId: secondaryAdmin.Id, ReasonCode: "CUSTOMER_SUPPORT_GOODWILL", ReasonNote: "[DEMO-TX-07] Survey review goodwill credit")
                },
                cancellationToken);

            await EnsureCitizenWalletWithLedgerAsync(
                context,
                citizens["citizen.sara@ecobin.com"].Id,
                new[]
                {
                    new DemoLedgerEventSpec(now.AddDays(-28), LedgerTransactionType.Credit, 5100, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "MIGRATION_BALANCE", ReasonNote: "[DEMO-TX-08] Verified campus recycling drive"),
                    new DemoLedgerEventSpec(now.AddDays(-14), LedgerTransactionType.Debit, -1000, LedgerSource.VoucherRedemption, VoucherId: rwdCarrefour.RewardId, ReasonNote: "[DEMO-TX-09] Carrefour voucher redemption"),
                    new DemoLedgerEventSpec(sess03.StartTime.AddMinutes(3), LedgerTransactionType.Credit, sess03.TotalPoints, LedgerSource.SessionAward, SessionId: sess03.SessionId),
                    new DemoLedgerEventSpec(sess07.StartTime.AddMinutes(4), LedgerTransactionType.Credit, sess07.TotalPoints, LedgerSource.SessionAward, SessionId: sess07.SessionId),
                    new DemoLedgerEventSpec(now.AddHours(-18), LedgerTransactionType.Credit, 245, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "BONUS_CAMPAIGN", ReasonNote: "[DEMO-TX-10] Zamalek hub streak reward")
                },
                cancellationToken);

            await EnsureCitizenWalletWithLedgerAsync(
                context,
                citizens["citizen.omar@ecobin.com"].Id,
                new[]
                {
                    new DemoLedgerEventSpec(now.AddDays(-20), LedgerTransactionType.Credit, 2600, LedgerSource.ManualAdjustment, CreatedByAdminId: secondaryAdmin.Id, ReasonCode: "COMMUNITY_AMBASSADOR", ReasonNote: "[DEMO-TX-11] District launch participant grant"),
                    new DemoLedgerEventSpec(now.AddDays(-9), LedgerTransactionType.Debit, -500, LedgerSource.VoucherRedemption, VoucherId: rwdVodafone.RewardId, ReasonNote: "[DEMO-TX-12] Vodafone voucher"),
                    new DemoLedgerEventSpec(sess04.StartTime.AddMinutes(2), LedgerTransactionType.Credit, sess04.TotalPoints, LedgerSource.SessionAward, SessionId: sess04.SessionId),
                    new DemoLedgerEventSpec(now.AddHours(-6), LedgerTransactionType.Credit, 505, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "CORRECTION", ReasonNote: "[DEMO-TX-13] Manual credit verification")
                },
                cancellationToken);

            await EnsureCitizenWalletWithLedgerAsync(
                context,
                citizens["citizen.salma@ecobin.com"].Id,
                new[]
                {
                    new DemoLedgerEventSpec(now.AddDays(-11), LedgerTransactionType.Credit, 750, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "STARTER_BONUS", ReasonNote: "[DEMO-TX-14] Initial green starter milestone"),
                    new DemoLedgerEventSpec(now.AddDays(-4), LedgerTransactionType.Debit, -200, LedgerSource.VoucherRedemption, VoucherId: rwdMetro.RewardId, ReasonNote: "[DEMO-TX-15] Metro Free Ticket redemption")
                },
                cancellationToken);

            await EnsureCitizenWalletWithLedgerAsync(
                context,
                citizens["citizen.suspended@ecobin.com"].Id,
                new[]
                {
                    new DemoLedgerEventSpec(now.AddDays(-19), LedgerTransactionType.Credit, 240, LedgerSource.ManualAdjustment, CreatedByAdminId: primaryAdmin.Id, ReasonCode: "STARTER_BONUS", ReasonNote: "[DEMO-TX-16] Initial onboarding grant")
                },
                cancellationToken);

            // 3F. Audit Logs (6 deterministic append-only audit rows matching seeded resources)
            await EnsureAuditLogAsync(context, primaryAdmin.Id, primaryAdmin.DisplayName, AuditActionTypes.BinRegistration, AuditResourceTypes.SmartBin, bins["BIN-E2E-101"].BinId.ToString(CultureInfo.InvariantCulture), "[DEMO-AUDIT-01] Registered Tahrir Main Hub smart bin.", "127.0.0.1", now.AddDays(-6), cancellationToken);
            await EnsureAuditLogAsync(context, primaryAdmin.Id, primaryAdmin.DisplayName, AuditActionTypes.CollectorProvisioning, AuditResourceTypes.Collector, collectors["collector@ecobin.com"].Id.ToString(CultureInfo.InvariantCulture), "[DEMO-AUDIT-02] Provisioned Downtown Cairo collector.", "127.0.0.1", now.AddDays(-5), cancellationToken);
            await EnsureAuditLogAsync(context, secondaryAdmin.Id, secondaryAdmin.DisplayName, AuditActionTypes.BinAssignment, AuditResourceTypes.SmartBin, bins["BIN-E2E-420"].BinId.ToString(CultureInfo.InvariantCulture), "[DEMO-AUDIT-03] Assigned Zamalek collector to Gezira North bin.", "127.0.0.1", now.AddDays(-4), cancellationToken);
            await EnsureAuditLogAsync(context, primaryAdmin.Id, primaryAdmin.DisplayName, AuditActionTypes.RewardCreate, AuditResourceTypes.Reward, rwdSpinneys.RewardId.ToString(CultureInfo.InvariantCulture), "[DEMO-AUDIT-04] Added Spinneys EGP 25 reward item.", "127.0.0.1", now.AddDays(-3), cancellationToken);
            await EnsureAuditLogAsync(context, primaryAdmin.Id, primaryAdmin.DisplayName, AuditActionTypes.InspectionCorrect, AuditResourceTypes.InspectionReport, rep02Id.ToString(CultureInfo.InvariantCulture), "[DEMO-AUDIT-05] Corrected misclassified plastic bottle.", "127.0.0.1", now.AddDays(-2), cancellationToken);
            await EnsureAuditLogAsync(context, primaryAdmin.Id, primaryAdmin.DisplayName, AuditActionTypes.InspectionRetrain, AuditResourceTypes.InspectionReport, rep01Id.ToString(CultureInfo.InvariantCulture), "[DEMO-AUDIT-06] Queued confirmed metal frame for retraining.", "127.0.0.1", now.AddDays(-1), cancellationToken);

            // 3G. Admin Notifications (unread + read for Admin 1; separate private notification for Admin 2)
            await EnsureNotificationAsync(
                context,
                targetAdminId: primaryAdmin.Id,
                audience: AdminNotificationAudiences.SysAdminBroadcast,
                title: "Bin #602 offline",
                message: "Nasr City International Park (Nasr City) requires connectivity check.",
                type: AdminNotificationTypes.Danger,
                sourceType: AdminNotificationSources.BinOffline,
                sourceReferenceId: "DEMO-NOTIF-01",
                isRead: false,
                createdAt: now.AddHours(-4),
                readAt: null,
                cancellationToken);

            await EnsureNotificationAsync(
                context,
                targetAdminId: primaryAdmin.Id,
                audience: AdminNotificationAudiences.SysAdminBroadcast,
                title: $"New AI review #{rep03Id}",
                message: "Pending disputed classification awaiting admin inspection decision.",
                type: AdminNotificationTypes.Warning,
                sourceType: AdminNotificationSources.InspectionReport,
                sourceReferenceId: "DEMO-NOTIF-02",
                isRead: false,
                createdAt: now.AddHours(-2),
                readAt: null,
                cancellationToken);

            await EnsureNotificationAsync(
                context,
                targetAdminId: primaryAdmin.Id,
                audience: AdminNotificationAudiences.SysAdminBroadcast,
                title: "Reward out of stock",
                message: "Spinneys Grocery E£ 25 Voucher reached 0 stock.",
                type: AdminNotificationTypes.Info,
                sourceType: AdminNotificationSources.RewardStock,
                sourceReferenceId: "DEMO-NOTIF-03",
                isRead: true,
                createdAt: now.AddDays(-1),
                readAt: now.AddHours(-12),
                cancellationToken);

            await EnsureNotificationAsync(
                context,
                targetAdminId: secondaryAdmin.Id,
                audience: AdminNotificationAudiences.DirectAdmin,
                title: "Private admin digest",
                message: "Weekly reconciliation task assigned to Nadia Hassan.",
                type: AdminNotificationTypes.Info,
                sourceType: AdminNotificationSources.DirectAdmin,
                sourceReferenceId: "DEMO-NOTIF-04",
                isRead: false,
                createdAt: now.AddHours(-3),
                readAt: null,
                cancellationToken);

            await context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }

        private static async Task<ApplicationUser> EnsureUserAsync(
            UserManager<ApplicationUser> userManager,
            DemoUserSpec spec,
            int? actorAdminId)
        {
            var user = await userManager.FindByEmailAsync(spec.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = spec.Email,
                    Email = spec.Email,
                    DisplayName = spec.DisplayName,
                    PhoneNumber = spec.PhoneNumber,
                    EmailConfirmed = true,
                    AccountStatus = spec.AccountStatus,
                    District = spec.District,
                    CreatedAt = spec.CreatedAt,
                    LastActiveAt = spec.LastActiveAt,
                    DeactivatedAt = spec.DeactivatedAt,
                    DeactivatedByAdminId = spec.MarkDeactivatedByAdmin ? actorAdminId : null,
                    SuspendedAt = spec.SuspendedAt,
                    SuspensionReason = spec.SuspensionReason,
                    SuspendedByAdminId = spec.MarkSuspendedByAdmin ? actorAdminId : null
                };

                var createResult = await userManager.CreateAsync(user, spec.Password);
                if (!createResult.Succeeded)
                {
                    var msg = string.Join("; ", createResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Failed to seed user '{spec.Email}': {msg}");
                }
            }

            var currentRoles = await userManager.GetRolesAsync(user);
            if (!currentRoles.Contains(spec.Role, StringComparer.OrdinalIgnoreCase))
            {
                if (currentRoles.Count == 0)
                {
                    var roleResult = await userManager.AddToRoleAsync(user, spec.Role);
                    if (!roleResult.Succeeded)
                    {
                        var msg = string.Join("; ", roleResult.Errors.Select(e => e.Description));
                        throw new InvalidOperationException($"Failed to assign role '{spec.Role}' to '{spec.Email}': {msg}");
                    }
                }
            }

            return user;
        }

        private static Dictionary<string, string> EnsureLocalDemoImages(string contentRootPath)
        {
            var demoDir = Path.Combine(contentRootPath, "wwwroot", "uploads", "demo");
            Directory.CreateDirectory(demoDir);

            var specs = new (string Key, string FileName, Rgb24 BaseColor, Rgb24 AccentColor)[]
            {
                ("reward-vodafone", "reward-vodafone.jpg", new Rgb24(220, 38, 38), new Rgb24(254, 226, 226)),
                ("reward-carrefour", "reward-carrefour.jpg", new Rgb24(37, 99, 235), new Rgb24(219, 234, 254)),
                ("reward-metro", "reward-metro.jpg", new Rgb24(16, 185, 129), new Rgb24(209, 250, 229)),
                ("reward-spinneys", "reward-spinneys.jpg", new Rgb24(245, 158, 11), new Rgb24(254, 243, 199)),
                ("reward-bottle", "reward-bottle.jpg", new Rgb24(107, 114, 128), new Rgb24(243, 244, 246)),
                ("sess-01", "sess-01.jpg", new Rgb24(20, 184, 166), new Rgb24(204, 251, 241)),
                ("sess-02", "sess-02.jpg", new Rgb24(34, 197, 94), new Rgb24(220, 252, 231)),
                ("sess-03", "sess-03.jpg", new Rgb24(59, 130, 246), new Rgb24(219, 234, 254)),
                ("sess-04", "sess-04.jpg", new Rgb24(168, 85, 247), new Rgb24(243, 232, 255)),
                ("sess-05", "sess-05.jpg", new Rgb24(14, 165, 233), new Rgb24(224, 242, 254)),
                ("frame-01", "frame-01.jpg", new Rgb24(15, 23, 42), new Rgb24(56, 189, 248)),
                ("frame-02", "frame-02.jpg", new Rgb24(30, 41, 59), new Rgb24(52, 211, 153)),
                ("frame-03", "frame-03.jpg", new Rgb24(51, 65, 85), new Rgb24(251, 191, 36)),
                ("frame-04", "frame-04.jpg", new Rgb24(17, 24, 39), new Rgb24(248, 113, 113))
            };

            var urls = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var (key, fileName, baseColor, accentColor) in specs)
            {
                var fullPath = Path.Combine(demoDir, fileName);
                if (!File.Exists(fullPath))
                {
                    using var image = new Image<Rgb24>(320, 200, baseColor);
                    for (int y = 40; y < 160; y++)
                    {
                        for (int x = 60; x < 260; x++)
                        {
                            if ((x + y) % 16 < 4 || x < 72 || x >= 248 || y < 52 || y >= 148)
                            {
                                image[x, y] = accentColor;
                            }
                        }
                    }

                    image.SaveAsJpeg(fullPath);
                }

                urls[key] = $"http://localhost:5121/uploads/demo/{fileName}";
            }

            return urls;
        }

        private static async Task EnsureServiceRecordAsync(
            AppDbContext context,
            int binId,
            int collectorId,
            DateTime servicedAt,
            decimal previousFillLevel,
            string notes,
            CancellationToken cancellationToken)
        {
            var exists = await context.ServiceRecords
                .AnyAsync(sr => sr.BinId == binId && sr.Notes == notes, cancellationToken);

            if (!exists)
            {
                await context.ServiceRecords.AddAsync(new ServiceRecord
                {
                    BinId = binId,
                    CollectorId = collectorId,
                    ServicedAt = servicedAt,
                    PreviousFillLevel = previousFillLevel,
                    Notes = notes
                }, cancellationToken);
                await context.SaveChangesAsync(cancellationToken);
            }
        }

        private static async Task<RewardCategory> EnsureCategoryAsync(
            AppDbContext context,
            string name,
            DateTime createdAt,
            CancellationToken cancellationToken)
        {
            var existing = await context.RewardCategories
                .FirstOrDefaultAsync(c => c.Name == name, cancellationToken);

            if (existing != null)
            {
                return existing;
            }

            var category = new RewardCategory
            {
                Name = name,
                IsActive = true,
                CreatedAt = createdAt
            };
            await context.RewardCategories.AddAsync(category, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            return category;
        }

        private static async Task<Reward> EnsureRewardAsync(
            AppDbContext context,
            int categoryId,
            string name,
            string description,
            int pointsCost,
            int stockQuantity,
            string voucherCodeType,
            string imageUrl,
            DateTime validFrom,
            DateTime validUntil,
            bool isActive,
            DateTime createdAt,
            CancellationToken cancellationToken)
        {
            var existing = await context.Rewards
                .FirstOrDefaultAsync(r => r.Name == name, cancellationToken);

            if (existing != null)
            {
                return existing;
            }

            var reward = new Reward
            {
                CategoryId = categoryId,
                Name = name,
                Description = description,
                PointsCost = pointsCost,
                StockQuantity = stockQuantity,
                VoucherCodeType = voucherCodeType,
                ImageUrl = imageUrl,
                ValidFrom = validFrom,
                ValidUntil = validUntil,
                IsActive = isActive,
                CreatedAt = createdAt
            };

            await context.Rewards.AddAsync(reward, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
            return reward;
        }

        private static async Task<DisposalSession> EnsureConfirmedSessionAsync(
            AppDbContext context,
            string markerImageUrl,
            int userId,
            int binId,
            DateTime sessionTime,
            IReadOnlyCollection<(WasteType Type, decimal Confidence)> items,
            CancellationToken cancellationToken)
        {
            var existingItem = await context.DisposalItems
                .AsNoTracking()
                .FirstOrDefaultAsync(di => di.Image == markerImageUrl, cancellationToken);

            if (existingItem != null)
            {
                return await context.DisposalSessions
                    .FirstAsync(s => s.SessionId == existingItem.SessionId, cancellationToken);
            }

            var totalPoints = items.Sum(i => i.Type.BasePoints);
            var session = new DisposalSession
            {
                UserId = userId,
                BinId = binId,
                StartTime = sessionTime,
                EndTime = sessionTime.AddMinutes(2),
                Status = SessionStatus.Completed,
                TotalPoints = totalPoints,
                PointsStatus = PointsStatus.Awarded
            };
            await context.DisposalSessions.AddAsync(session, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var createdItems = new List<DisposalItem>();
            var index = 0;
            foreach (var (wasteType, confidence) in items)
            {
                var item = new DisposalItem
                {
                    SessionId = session.SessionId,
                    WasteTypeId = wasteType.WasteTypeId,
                    Image = index == 0 ? markerImageUrl : $"{markerImageUrl}#item-{index + 1}",
                    DetectedAt = sessionTime.AddSeconds(20 + index * 10),
                    EstimatedPoints = wasteType.BasePoints,
                    AIConfidence = confidence
                };
                createdItems.Add(item);
                index++;
            }

            await context.DisposalItems.AddRangeAsync(createdItems, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var survey = new DisposalSurvey
            {
                SessionId = session.SessionId,
                TotalCalculatedPoints = totalPoints,
                CreatedAt = sessionTime.AddMinutes(2),
                Status = SurveyStatus.Done,
                Outcome = SurveyOutcome.Confirmed,
                SubmittedAt = sessionTime.AddMinutes(3)
            };
            await context.DisposalSurveys.AddAsync(survey, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var responses = createdItems.Select(item => new SurveyResponse
            {
                SurveyId = survey.SurveyId,
                ItemId = item.ItemId,
                IsCorrect = true,
                UserSelectedTypeId = null,
                CreatedAt = sessionTime.AddMinutes(3)
            }).ToList();

            await context.SurveyResponses.AddRangeAsync(responses, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            return session;
        }

        private static async Task<(DisposalSession Session, int ReportId)> EnsureDisputedSessionWithReportAsync(
            AppDbContext context,
            string markerImageUrl,
            int userId,
            int binId,
            DateTime sessionTime,
            WasteType predictedType,
            WasteType userSelectedType,
            decimal confidence,
            string reportStatus,
            string? reviewDecision,
            WasteType? confirmedType,
            string? adminJustification,
            string retrainingStatus,
            int? actorAdminId,
            bool awardPointsImmediately,
            CancellationToken cancellationToken)
        {
            var existingReport = await context.InspectionReports
                .Include(r => r.Session)
                .FirstOrDefaultAsync(r => r.ImageUrl == markerImageUrl, cancellationToken);

            if (existingReport?.Session != null)
            {
                return (existingReport.Session, existingReport.ReportId);
            }

            var finalPoints = awardPointsImmediately && confirmedType != null
                ? confirmedType.BasePoints
                : predictedType.BasePoints;

            var session = new DisposalSession
            {
                UserId = userId,
                BinId = binId,
                StartTime = sessionTime,
                EndTime = sessionTime.AddMinutes(2),
                Status = awardPointsImmediately ? SessionStatus.Completed : SessionStatus.PendingSurvey,
                TotalPoints = finalPoints,
                PointsStatus = awardPointsImmediately ? PointsStatus.Awarded : PointsStatus.Pending
            };
            await context.DisposalSessions.AddAsync(session, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var item = new DisposalItem
            {
                SessionId = session.SessionId,
                WasteTypeId = predictedType.WasteTypeId,
                Image = markerImageUrl,
                DetectedAt = sessionTime.AddSeconds(30),
                EstimatedPoints = predictedType.BasePoints,
                AIConfidence = confidence
            };
            await context.DisposalItems.AddAsync(item, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var survey = new DisposalSurvey
            {
                SessionId = session.SessionId,
                TotalCalculatedPoints = finalPoints,
                CreatedAt = sessionTime.AddMinutes(2),
                Status = SurveyStatus.Done,
                Outcome = SurveyOutcome.CorrectionSubmitted,
                SubmittedAt = sessionTime.AddMinutes(4)
            };
            await context.DisposalSurveys.AddAsync(survey, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var response = new SurveyResponse
            {
                SurveyId = survey.SurveyId,
                ItemId = item.ItemId,
                IsCorrect = false,
                UserSelectedTypeId = userSelectedType.WasteTypeId,
                CreatedAt = sessionTime.AddMinutes(4)
            };
            await context.SurveyResponses.AddAsync(response, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var reviewedAt = reportStatus == InspectionReportStatus.Pending
                ? (DateTime?)null
                : sessionTime.AddHours(2);

            var retrainAt = retrainingStatus == InspectionRetrainingStatus.Queued
                ? reviewedAt?.AddMinutes(15)
                : null;

            var report = new InspectionReport
            {
                ItemId = item.ItemId,
                SurveyId = survey.SurveyId,
                SessionId = session.SessionId,
                UserId = userId,
                BinId = binId,
                PredictedWasteTypeId = predictedType.WasteTypeId,
                UserSelectedWasteTypeId = userSelectedType.WasteTypeId,
                PredictedConfidence = confidence,
                ImageUrl = markerImageUrl,
                AiRating = null,
                Status = reportStatus,
                ReviewDecision = reviewDecision,
                ConfirmedWasteTypeId = confirmedType?.WasteTypeId,
                AdminJustification = adminJustification,
                ReviewedByAdminId = reviewedAt.HasValue ? actorAdminId : null,
                ReviewedAt = reviewedAt,
                RetrainingStatus = retrainingStatus,
                RetrainingRequestedAt = retrainAt,
                RetrainingRequestedByAdminId = retrainAt.HasValue ? actorAdminId : null,
                CreatedAt = sessionTime.AddMinutes(4)
            };
            await context.InspectionReports.AddAsync(report, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            return (session, report.ReportId);
        }

        private static async Task EnsureCitizenWalletWithLedgerAsync(
            AppDbContext context,
            int userId,
            IReadOnlyCollection<DemoLedgerEventSpec> orderedEvents,
            CancellationToken cancellationToken)
        {
            var existingWallet = await context.Wallets
                .FirstOrDefaultAsync(w => w.UserId == userId, cancellationToken);

            if (existingWallet != null)
            {
                // Preserve any existing wallet and runtime transactions on subsequent seeder runs.
                return;
            }

            var wallet = new Wallet
            {
                UserId = userId,
                AvailablePoints = 0,
                LifetimeEarnedPoints = 0
            };
            await context.Wallets.AddAsync(wallet, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            var runningBalance = 0;
            var lifetimeEarned = 0;
            var entries = new List<LedgerTransaction>(orderedEvents.Count);

            foreach (var ev in orderedEvents.OrderBy(e => e.CreatedAt))
            {
                if (runningBalance + ev.PointsDelta < 0)
                {
                    throw new InvalidOperationException($"Demo ledger event for user {userId} produces a negative running balance.");
                }

                runningBalance += ev.PointsDelta;
                if (ev.PointsDelta > 0)
                {
                    lifetimeEarned += ev.PointsDelta;
                }

                entries.Add(new LedgerTransaction
                {
                    WalletId = wallet.WalletId,
                    SessionId = ev.SessionId,
                    VoucherId = ev.VoucherId,
                    TransactionType = ev.TransactionType,
                    PointsDelta = ev.PointsDelta,
                    RunningBalance = runningBalance,
                    Source = ev.Source,
                    CreatedByAdminId = ev.CreatedByAdminId,
                    ReasonCode = ev.ReasonCode,
                    ReasonNote = ev.ReasonNote,
                    CreatedAt = ev.CreatedAt
                });
            }

            wallet.AvailablePoints = runningBalance;
            wallet.LifetimeEarnedPoints = lifetimeEarned;

            await context.LedgerTransactions.AddRangeAsync(entries, cancellationToken);
            await context.SaveChangesAsync(cancellationToken);
        }

        private static async Task EnsureAuditLogAsync(
            AppDbContext context,
            int adminId,
            string adminName,
            string actionType,
            string resourceType,
            string resourceId,
            string justification,
            string ipAddress,
            DateTime createdAt,
            CancellationToken cancellationToken)
        {
            var exists = await context.AuditLogs
                .AnyAsync(a => a.Justification == justification, cancellationToken);

            if (!exists)
            {
                await context.AuditLogs.AddAsync(new AuditLog
                {
                    AdminId = adminId,
                    AdminName = adminName,
                    ActionType = actionType,
                    ResourceType = resourceType,
                    ResourceId = resourceId,
                    Justification = justification,
                    IpAddress = ipAddress,
                    CreatedAt = createdAt
                }, cancellationToken);
                await context.SaveChangesAsync(cancellationToken);
            }
        }

        private static async Task EnsureNotificationAsync(
            AppDbContext context,
            int targetAdminId,
            string audience,
            string title,
            string message,
            string type,
            string sourceType,
            string sourceReferenceId,
            bool isRead,
            DateTime createdAt,
            DateTime? readAt,
            CancellationToken cancellationToken)
        {
            var exists = await context.AdminNotifications
                .AnyAsync(n => n.TargetAdminId == targetAdminId && n.SourceReferenceId == sourceReferenceId, cancellationToken);

            if (!exists)
            {
                await context.AdminNotifications.AddAsync(new AdminNotification
                {
                    TargetAdminId = targetAdminId,
                    Audience = audience,
                    Title = title,
                    Message = message,
                    Type = type,
                    SourceType = sourceType,
                    SourceReferenceId = sourceReferenceId,
                    IsRead = isRead,
                    CreatedAt = createdAt,
                    ReadAt = readAt
                }, cancellationToken);
                await context.SaveChangesAsync(cancellationToken);
            }
        }
    }
}
