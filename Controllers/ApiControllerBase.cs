using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace EcoBin.Api;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected int UserId
    {
        get
        {
            var raw = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub")
                    ?? User.FindFirstValue("userId");
            return int.TryParse(raw, out var id) ? id : throw new AppException(401, "UNAUTHORIZED", "Invalid token.");
        }
    }
}