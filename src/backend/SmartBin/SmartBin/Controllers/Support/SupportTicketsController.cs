using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBin.Common.Swagger;
using SmartBin.Context;
using SmartBin.DTOs.Common;
using SmartBin.DTOs.Support;
using SmartBin.Models;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/support")]
    public class SupportTicketsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SupportTicketsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("tickets")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<List<SupportTicketResponseDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status401Unauthorized)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.SupportGetTicketsSuccess)]
        public async Task<IActionResult> GetMyTickets(CancellationToken cancellationToken)
        {
            var rawUserId = User.FindFirstValue("id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(rawUserId, out int userId))
            {
                return Unauthorized(new
                {
                    success = false,
                    error = new { code = "UNAUTHORIZED", message = "Access token is missing or invalid." }
                });
            }

            var tickets = await _db.SupportTickets
                .AsNoTracking()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new SupportTicketResponseDto
                {
                    TicketId = t.TicketCode,
                    Category = t.Category,
                    Description = t.Description,
                    SessionId = t.SessionId,
                    Status = t.Status,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                data = tickets
            });
        }

        [HttpPost("tickets")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<SupportTicketResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.SupportSubmitTicketSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.SupportSubmitTicketBadRequest)]
        public async Task<IActionResult> SubmitTicket(
            [FromBody] CreateSupportTicketRequestDto request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new
                {
                    success = false,
                    error = new
                    {
                        code = "VALIDATION_ERROR",
                        message = "Description is required."
                    }
                });
            }

            var rawUserId = User.FindFirstValue("id") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
            int? userId = int.TryParse(rawUserId, out int parsedUserId) ? parsedUserId : null;

            var ticketCode = $"TICK-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var category = string.IsNullOrWhiteSpace(request.Category)
                ? "general_inquiry"
                : request.Category.Trim();

            var ticket = new SupportTicket
            {
                TicketCode = ticketCode,
                UserId = userId,
                Category = category,
                Description = request.Description.Trim(),
                SessionId = string.IsNullOrWhiteSpace(request.SessionId) ? null : request.SessionId.Trim(),
                Status = "open",
                CreatedAt = DateTime.UtcNow
            };

            _db.SupportTickets.Add(ticket);
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new
            {
                success = true,
                data = new SupportTicketResponseDto
                {
                    TicketId = ticket.TicketCode,
                    Category = ticket.Category,
                    Description = ticket.Description,
                    SessionId = ticket.SessionId,
                    Status = ticket.Status,
                    CreatedAt = ticket.CreatedAt
                }
            });
        }
    }
}
