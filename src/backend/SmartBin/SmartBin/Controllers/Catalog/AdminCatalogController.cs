using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.DTOs;
using SmartBin.DTOs.Common;
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
		private readonly IStorageService _storageService;

		public AdminCatalogController(
			IRewardService rewardService,
			IRewardCategoryService categoryService,
			IStorageService storageService)
		{
			_rewardService = rewardService;
			_categoryService = categoryService;
			_storageService = storageService;
		}

		// E34: Get all catalog items
		[HttpGet]
		[ProducesResponseType(typeof(PagedApiResponse<List<RewardResponseDto>>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
		public async Task<IActionResult> GetAll(
			[FromQuery] int? categoryId,
			[FromQuery] string? status,
			[FromQuery] string? search,
			[FromQuery] int page = 1,
			[FromQuery] int pageSize = 10,
			[FromQuery] string? sortBy = null,
			[FromQuery] string? sortDir = "asc")
		{
			if (page < 1)
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Invalid pagination values.", "page", "page must be greater than or equal to 1.");
			}

			if (pageSize < 1 || pageSize > 100)
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Invalid pagination values.", "pageSize", "pageSize must be between 1 and 100.");
			}

			if (categoryId is <= 0)
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Invalid categoryId filter.", "categoryId", "categoryId must be greater than 0.");
			}

			var normalizedStatus = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToLowerInvariant();
			var allowedStatuses = new[]
			{
				"in_stock",
				"out_of_stock",
				"archived"
			};

			if (normalizedStatus != null && !allowedStatuses.Contains(normalizedStatus))
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Invalid status value.", "status", "Must be in_stock, out_of_stock, or archived.");
			}

			var normalizedSortBy = string.IsNullOrWhiteSpace(sortBy) ? null : sortBy.Trim().ToLowerInvariant();
			var allowedSortFields = new[]
			{
				"title",
				"category",
				"pointscost",
				"stock",
				"redemptionscount",
				"status"
			};

			if (normalizedSortBy != null && !allowedSortFields.Contains(normalizedSortBy))
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Invalid sortBy value.", "sortBy", "Must be one of: title, category, pointsCost, stock, redemptionsCount, status.");
			}

			var normalizedSortDir = string.IsNullOrWhiteSpace(sortDir) ? "asc" : sortDir.Trim().ToLowerInvariant();
			if (normalizedSortDir != "asc" && normalizedSortDir != "desc")
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Invalid sortDir value.", "sortDir", "Must be asc or desc.");
			}

			var result = await _rewardService.GetAllAsync(
				categoryId,
				normalizedStatus,
				search,
				page,
				pageSize,
				normalizedSortBy,
				normalizedSortDir
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
		[ProducesResponseType(typeof(ApiResponse<RewardResponseDto>), StatusCodes.Status201Created)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
		public async Task<IActionResult> Create(
			[FromBody] CreateRewardRequestDto request,
			CancellationToken cancellationToken = default)
		{
			if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
			{
				return UnauthorizedError();
			}

			var result = await _rewardService.CreateAsync(request, actorAdminId, cancellationToken);

			return StatusCode(201, new
			{
				success = true,
				data = result
			});
		}

		// E36: Get active reward categories
		[HttpGet("categories")]
		[ProducesResponseType(typeof(ApiResponse<List<RewardCategoryResponseDto>>), StatusCodes.Status200OK)]
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
		[ProducesResponseType(typeof(ApiResponse<RewardCategoryResponseDto>), StatusCodes.Status201Created)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
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
			catch (InvalidOperationException ex)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = ex.Message
					}
				});
			}
			catch (ArgumentException ex)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = ex.Message
					}
				});
			}
		}

		// NEW-CAT-UPDATE: Update reward category
		[HttpPut("categories/{categoryId:int}")]
		[ProducesResponseType(typeof(ApiResponse<RewardCategoryResponseDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
		public async Task<IActionResult> UpdateCategory(
			int categoryId,
			[FromBody] UpdateRewardCategoryRequestDto request)
		{
			var (result, category) = await _categoryService.UpdateAsync(categoryId, request);

			if (result == UpdateCategoryResult.NotFound)
			{
				return NotFound(new
				{
					success = false,
					error = new
					{
						code = "NOT_FOUND",
						message = "Category not found."
					}
				});
			}

			if (result == UpdateCategoryResult.ConflictNameArchived)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "A category with this name already exists in the archive. You can unarchive it instead of renaming."
					}
				});
			}

			if (result == UpdateCategoryResult.ConflictName)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "A category with this name already exists."
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = category
			});
		}

		// NEW-CAT-ARCHIVE: Archive reward category
		[HttpPost("categories/{categoryId:int}/archive")]
		[ProducesResponseType(typeof(ApiResponse<CategoryArchiveStatusDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
		public async Task<IActionResult> ArchiveCategory(int categoryId)
		{
			var result = await _categoryService.ArchiveAsync(categoryId);

			if (result == ArchiveCategoryResult.NotFound)
			{
				return NotFound(new
				{
					success = false,
					error = new
					{
						code = "NOT_FOUND",
						message = "Category not found."
					}
				});
			}

			if (result == ArchiveCategoryResult.AlreadyArchived)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "Category is already archived."
					}
				});
			}

			if (result == ArchiveCategoryResult.HasActiveRewards)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "Cannot archive category because it has active rewards. Archive or deactivate related rewards first."
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = new
				{
					categoryId,
					status = "archived",
					archivedAt = DateTime.UtcNow
				}
			});
		}

		// Unarchive reward category
		[HttpPost("categories/{categoryId:int}/unarchive")]
		[ProducesResponseType(typeof(ApiResponse<CategoryArchiveStatusDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
		public async Task<IActionResult> UnarchiveCategory(int categoryId)
		{
			var result = await _categoryService.UnarchiveAsync(categoryId);

			if (result == UnarchiveCategoryResult.NotFound)
			{
				return NotFound(new
				{
					success = false,
					error = new
					{
						code = "NOT_FOUND",
						message = "Category not found."
					}
				});
			}

			if (result == UnarchiveCategoryResult.NotArchived)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "Category is not archived."
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = new
				{
					categoryId,
					status = "active"
				}
			});
		}

		// E38: Upload reward or banner image (supports folder="rewards" or folder="categories")
		[HttpPost("upload-image")]
		[Consumes("multipart/form-data")]
		[ProducesResponseType(typeof(ApiResponse<UploadImageResponseDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status413PayloadTooLarge)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status415UnsupportedMediaType)]
		public async Task<IActionResult> UploadImage(
			IFormFile? file,
			[FromQuery] string folder = "rewards")
		{
			if (file == null || file.Length == 0)
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "File is required.", "file", "File is required.");
			}

			// Max file size: 4 MB (matches CloudflareR2StorageService.MaxPhotoBytes)
			const long maxSizeBytes = 4 * 1024 * 1024;
			if (file.Length > maxSizeBytes)
			{
				return CatalogError(StatusCodes.Status413PayloadTooLarge, "PAYLOAD_TOO_LARGE", "File size exceeds the allowed limit (4 MB).", "file", "File size exceeds the allowed limit (4 MB).");
			}

			var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
			var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
			var allowedContentTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
			var contentType = file.ContentType?.Trim();
			var hasExplicitNonGenericMime = !string.IsNullOrWhiteSpace(contentType) &&
				!string.Equals(contentType, "application/octet-stream", StringComparison.OrdinalIgnoreCase);

			if (!allowedExtensions.Contains(extension) ||
				(hasExplicitNonGenericMime && !allowedContentTypes.Contains(contentType!, StringComparer.OrdinalIgnoreCase)))
			{
				return CatalogError(StatusCodes.Status415UnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", "Only JPEG, PNG and WEBP images are accepted.", "file", "Only JPEG, PNG and WEBP images are accepted.");
			}

			var targetFolder = string.Equals(folder, "categories", StringComparison.OrdinalIgnoreCase)
				? "categories"
				: "rewards";

			var imageUrl = await _storageService.UploadFileAsync(file, targetFolder);

			return Ok(new
			{
				success = true,
				data = new
				{
					imageUrl
				}
			});
		}

		// E39: Update catalog item
		[HttpPut("{itemId:int}")]
		[ProducesResponseType(typeof(ApiResponse<RewardResponseDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
		public async Task<IActionResult> Update(
			int itemId,
			[FromBody] UpdateRewardRequestDto request,
			CancellationToken cancellationToken = default)
		{
			if (itemId <= 0)
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "itemId must be greater than 0.", "itemId", "itemId must be greater than 0.");
			}

			if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
			{
				return UnauthorizedError();
			}

			var result = await _rewardService.UpdateAsync(itemId, request, actorAdminId, cancellationToken);

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
		[ProducesResponseType(typeof(ApiResponse<ItemArchiveStatusDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
		public async Task<IActionResult> Archive(
			int itemId,
			CancellationToken cancellationToken = default)
		{
			if (itemId <= 0)
			{
				return CatalogError(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "itemId must be greater than 0.", "itemId", "itemId must be greater than 0.");
			}

			if (!User.TryGetUserId(out var actorAdminId) || actorAdminId <= 0)
			{
				return UnauthorizedError();
			}

			var result = await _rewardService.ArchiveAsync(itemId, actorAdminId, cancellationToken);

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
						message = "Item is already archived."
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

		// Unarchive catalog item
		[HttpPost("{itemId:int}/unarchive")]
		[ProducesResponseType(typeof(ApiResponse<ItemArchiveStatusDto>), StatusCodes.Status200OK)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
		[ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
		public async Task<IActionResult> Unarchive(int itemId)
		{
			var result = await _rewardService.UnarchiveAsync(itemId);

			if (result == UnarchiveRewardResult.NotFound)
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

			if (result == UnarchiveRewardResult.NotArchived)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "Reward is not archived."
					}
				});
			}

			if (result == UnarchiveRewardResult.CategoryArchived)
			{
				return Conflict(new
				{
					success = false,
					error = new
					{
						code = "CONFLICT",
						message = "Cannot unarchive reward because its parent category is archived. Unarchive category first."
					}
				});
			}

			return Ok(new
			{
				success = true,
				data = new
				{
					itemId,
					status = "active"
				}
			});
		}

		private IActionResult CatalogError(int statusCode, string code, string message, string field, string detailMessage)
		{
			return StatusCode(statusCode, new
			{
				success = false,
				error = new
				{
					code,
					message,
					details = new[]
					{
						new { field, message = detailMessage }
					}
				}
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
