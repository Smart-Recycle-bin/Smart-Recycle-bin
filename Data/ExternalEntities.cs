// -----------------------------------------------------------------------------
// TEMPORARY copies of tables that belong to other members (shape taken from the ERD).
// When you merge into the shared project: DELETE THIS FILE and use their real classes.
// -----------------------------------------------------------------------------
using System;

namespace EcoBin.Api;

public class User            // Member 1
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
    public string DisplayName { get; set; } = "";
    public string AccountStatus { get; set; } = "active";   // "suspended" / "banned" = blocked
}

public class Role            // Member 1
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = "";
}

public class RewardCategory  // Member 4
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = "";
    public string? LogoUrl { get; set; }   // <-- Added
    public bool IsActive { get; set; }
}

public class Reward          // Member 4
{
    public int RewardId { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public int PointsCost { get; set; }
    public int StockQuantity { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? ValidFrom { get; set; }  // <-- Added
    public DateTime? ValidUntil { get; set; }
    public bool IsActive { get; set; }

    public RewardCategory Category { get; set; } = null!;
}

public class WasteType       // Member 2/3
{
    public int WasteTypeId { get; set; }
    public string Name { get; set; } = "";
}

public class DisposalSession // Member 2
{
    public int SessionId { get; set; }
    public int UserId { get; set; }
    public int BinId { get; set; }
}

public class DisposalSurvey  // Member 2
{
    public int SurveyId { get; set; }
    public int SessionId { get; set; }
}

public class DisposalItem    // Member 3
{
    public int ItemId { get; set; }
    public int SessionId { get; set; }
    public int WasteTypeId { get; set; }
    public string? Image { get; set; }
    public int EstimatedPoints { get; set; }
    public decimal AiConfidence { get; set; }
}
