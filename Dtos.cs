using System.Collections.Generic;
using System;
using System.Text.Json.Serialization;

namespace EcoBin.Api;

// ---- Catalog / vouchers ----
public record CatalogCard(int ItemId, int CategoryId, string Brand, string Title, string? LogoUrl,
    int StartingPointsCost, int OptionsCount, string Status);

public record CatalogOption(int ItemId, string Title, int PointsCost, bool InStock);

public record CatalogDetail(int ItemId, int CategoryId, string Brand, string Title, string? Description,
    string? LogoUrl, int PointsCost, bool InStock, DateTime? ValidUntil, List<CatalogOption> Options);

public record RedemptionResult(int RedemptionId, int ItemId, int VoucherId, string VoucherCode,
    int PointsSpent, decimal ValueEgpAtRedemption, int NewAvailablePoints);

public record VoucherItem(int VoucherId, int RedemptionId, string ItemTitle, int PointsSpent,
    decimal ValueEgpAtRedemption, string VoucherCode, string QrImageUrl, DateTime RedeemedAt, string Status);

// ---- Inspections ----
public record InspectionListItem(int ReportId, int SessionId, int BinId, string BinName,
    string ImageThumbnailUrl, string MlPredictedWasteType, decimal MlConfidence, string? UserFeedback,
    DateTime CreatedAt, string? ReviewDecision, string RetrainingStatus);

/// <summary>Also used by Yousefe (E50).</summary>
public record InspectionSummary(int LabelledImages, int PendingReviews, int ReviewedReports,
    int ImagesUntilNextRetraining, int NextRetrainingThreshold);

public record InspectionListResponse(List<InspectionListItem> Items, InspectionSummary Summary, int Total);

public record InspectionDetail(int ReportId, int SessionId, int BinId, int RecyclerId, string RecyclerName,
    string? UserFeedback, string MlPredictedWasteType, int EstimatedPoints, string ImageUrl,
    string? ReviewDecision, string RetrainingStatus, DateTime CreatedAt);

public record ResolveResult(
    int ReportId,
    string ReviewDecision,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? ConfirmedWasteType,
    bool SessionPointsFinalized,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? PointsAwarded,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] int? TransactionId);

public record RetrainResult(int ReportId, string RetrainingStatus);

/// <summary>Body of E68. Example: { "wasteTypeId": "METAL" }</summary>
public class CorrectRequest
{
    public string? WasteTypeId { get; set; }
}

/// <summary>Used by Abobakr's reject flow (E26).</summary>
public record NewInspectionReport(int DisposalItemId, string? Feedback);