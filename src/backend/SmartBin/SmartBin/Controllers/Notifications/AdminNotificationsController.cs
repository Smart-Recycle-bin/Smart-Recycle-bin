using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Services.Notifications;

namespace SmartBin.Controllers.Notifications
{
    [ApiController]
    [Route("api/v1/admin/notifications")]
    [Authorize(Roles = "SYS_ADMIN")]
    public class AdminNotificationsController : ControllerBase
    {
        private readonly IAdminNotificationService _notificationService;

        public AdminNotificationsController(IAdminNotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        /// <summary>
        /// E75 — Current admin's notifications feed and unread badge count
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNotifications(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var currentAdminId) || currentAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var (feed, meta) = await _notificationService.GetNotificationsForAdminAsync(
                currentAdminId,
                page,
                pageSize,
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = feed,
                meta
            });
        }

        /// <summary>
        /// E76 — Mark all notifications owned by the current admin as read
        /// </summary>
        [HttpPost("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var currentAdminId) || currentAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _notificationService.MarkAllAsReadAsync(currentAdminId, cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        /// <summary>
        /// E77 — Mark a single notification owned by the current admin as read
        /// </summary>
        [HttpPatch("{id:int}/read")]
        public async Task<IActionResult> MarkAsRead(
            [FromRoute] int id,
            CancellationToken cancellationToken = default)
        {
            if (!User.TryGetUserId(out var currentAdminId) || currentAdminId <= 0)
            {
                return UnauthorizedError();
            }

            var result = await _notificationService.MarkAsReadAsync(id, currentAdminId, cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        private UnauthorizedObjectResult UnauthorizedError()
        {
            return Unauthorized(new
            {
                success = false,
                error = new
                {
                    code = "UNAUTHORIZED",
                    message = "Access token is missing or invalid."
                }
            });
        }
    }
}
