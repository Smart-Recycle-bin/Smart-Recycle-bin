using Microsoft.AspNetCore.Mvc;
using SmartBin.DTOs.Support;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/support")]
    public class SupportTicketsController : ControllerBase
    {
        [HttpPost("tickets")]
        public IActionResult SubmitTicket([FromBody] CreateSupportTicketRequestDto request)
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

            var ticketId = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
            return Ok(new
            {
                success = true,
                data = new
                {
                    ticketId = $"TICK-{ticketId}",
                    category = request.Category,
                    status = "open",
                    createdAt = DateTime.UtcNow
                }
            });
        }
    }
}
