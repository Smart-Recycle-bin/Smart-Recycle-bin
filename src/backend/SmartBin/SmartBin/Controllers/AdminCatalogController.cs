
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.DTOs;
using SmartBin.Services;

namespace SmartBin.Controllers
{
	[ApiController]
	[Route("api/v1/admin/catalog")]
	[Authorize(Roles = "SYS_ADMIN")]
	public class AdminCatalogController : ControllerBase
	{
		private readonly IRewardService _rewardService;
		private readonly IRewardCategoryService _categoryService;

		public AdminCatalogController(
			IRewardService rewardService,
			IRewardCategoryService categoryService)
		{
			_rewardService = rewardService;
			_categoryService = categoryService;
		}

		// E34: Get all catalog items
		[HttpGet]
		public async Task<IActionResult> GetAll(
			[FromQuery] int? categoryId,
			[FromQuery] string? status,
			[FromQuery] string? search,
			[FromQuery] int page = 1,
			[FromQuery] int pageSize = 10,
			[FromQuery] string? sortBy = null,
			[FromQuery] string? sortDir = "asc")
		{
			if (page < 1 || pageSize < 1 || pageSize > 100)
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = "Invalid pagination values."
					}
				});
			}

			var allowedStatuses = new[]
			{
				"in_stock",
				"out_of_stock",
				"archived"
			};

			if (!string.IsNullOrWhiteSpace(status) &&
				!allowedStatuses.Contains(status.ToLowerInvariant()))
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = "Invalid status value."
					}
				});
			}

			var allowedSortFields = new[]
			{
				"title",
				"pointscost",
				"stock"
			};

			if (!string.IsNullOrWhiteSpace(sortBy) &&
				!allowedSortFields.Contains(sortBy.ToLowerInvariant()))
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = "Invalid sortBy value."
					}
				});
			}

			if (!string.IsNullOrWhiteSpace(sortDir) &&
				sortDir.ToLowerInvariant() != "asc" &&
				sortDir.ToLowerInvariant() != "desc")
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = "Invalid sortDir value."
					}
				});
			}

			var result = await _rewardService.GetAllAsync(
				categoryId,
				status,
				search,
				page,
				pageSize,
				sortBy,
				sortDir
			);

			return Ok(new
			{
				success = true,
				data = result.Items,
				meta = new
				{
					page,
					pageSize,
					totalItems = result.TotalItems,
					totalPages = (int)Math.Ceiling(
						(double)result.TotalItems / pageSize
					)
				}
			});
		}

		// E35: Create catalog item
		[HttpPost]
		public async Task<IActionResult> Create(
			[FromBody] CreateRewardRequestDto request)
		{
			try
			{
				var result = await _rewardService.CreateAsync(request);

				return StatusCode(201, new
				{
					success = true,
					data = result
				});
			}
			catch (ArgumentException)
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = "The specified category does not exist."
					}
				});
			}
		}

		// E36: Get active reward categories
		[HttpGet("categories")]
		public async Task<IActionResult> GetCategories()
		{
			var categories = await _categoryService.GetActiveAsync();

			return Ok(new
			{
				success = true,
				data = categories
			});
		}

		// E37: Create reward category
		[HttpPost("categories")]
		public async Task<IActionResult> CreateCategory(
			[FromBody] CreateRewardCategoryRequestDto request)
		{
			try
			{
				var category = await _categoryService.CreateAsync(request);

				return StatusCode(201, new
				{
					success = true,
					data = category
				});
			}
			catch (ArgumentException ex)
			{
				return BadRequest(new
				{
					success = false,
					error = new
					{
						code = "VALIDATION_ERROR",
						message = ex.Message
					}
				});
			}
		}


		// E39: Update catalog item
		[HttpPut("{itemId:int}")]
		public async Task<IActionResult> Update(
			int itemId,
			[FromBody] UpdateRewardRequestDto request)
		{
			var result = await _rewardService.UpdateAsync(itemId, request);

			if (result == null)
			{
				return NotFound(new
				{
					success = false,
					error = new
					{
						code = "NOT_FOUND",
						message = "Catalog item not found."
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = result
			});
		}

		// E40: Archive catalog item
		[HttpPost("{itemId:int}/archive")]
		public async Task<IActionResult> Archive(int itemId)
		{
			var result = await _rewardService.ArchiveAsync(itemId);

			if (result == ArchiveRewardResult.NotFound)
			{
				return NotFound(new
				{
					success = false,
					error = new
					{
						code = "NOT_FOUND",
						message = "Catalog item not found."
					}
				});
			}

			if (result == ArchiveRewardResult.AlreadyArchived)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "Reward is already archived."
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = new
				{
					itemId,
					status = "archived"
				}
			});
		}
	}
}
