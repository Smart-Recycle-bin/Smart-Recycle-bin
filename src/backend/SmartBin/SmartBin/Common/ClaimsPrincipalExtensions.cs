using System.Security.Claims;

namespace SmartBin.Common
{
    public static class ClaimsPrincipalExtensions
    {
        public static bool TryGetUserId(this ClaimsPrincipal? principal, out int userId)
        {
            userId = 0;
            if (principal == null)
            {
                return false;
            }

            var raw = principal.FindFirstValue("id") ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(raw, out userId);
        }

        public static int? GetUserId(this ClaimsPrincipal? principal)
        {
            return TryGetUserId(principal, out int userId) ? userId : null;
        }
    }
}
