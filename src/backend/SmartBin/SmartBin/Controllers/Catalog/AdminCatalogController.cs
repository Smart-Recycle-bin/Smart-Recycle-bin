using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBin.Common;
using SmartBin.Common.Swagger;
using SmartBin.DTOs;
using SmartBin.DTOs.Common;
using SmartBin.Models.Constants;
using SmartBin.Services;
using SmartBin.Services.Audit;

namespace SmartBin.Controllers
{
    [ApiController]
    [Route("api/v1/admin/catalog")]
    [Authorize(Roles = RoleNames.Admin)]
    public class AdminCatalogController : ControllerBase
    {
        private readonly IRewardService _rewardService;
        private readonly IRewardCategoryService _categoryService;
        private readonly IStorageService _storageService;
        private readonly IAuditLogService _auditLogService;

        public AdminCatalogController(
            IRewardService rewardService,
            IRewardCategoryService categoryService,
            IStorageService storageService,
            IAuditLogService auditLogService)
        {
            _rewardService = rewardService;
            _categoryService = categoryService;
            _storageService = storageService;
            _auditLogService = auditLogService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(PagedApiResponse<List<RewardResponseDto>>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminCatalogListSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
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

        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<RewardResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [SwaggerResponseExample(StatusCodes.Status201Created, SwaggerExamples.AdminCatalogItemSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        public async Task<IActionResult> Create(
            [FromBody] CreateRewardRequestDto request)
        {
            try
            {
                var result = await _rewardService.CreateAsync(request);

                if (User.TryGetUserId(out int adminId))
                {
                    await _auditLogService.LogAsync(adminId, "CATALOG_CREATE", "REWARD", result.ItemId);
                }

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

        [HttpGet("categories")]
        [ProducesResponseType(typeof(ApiResponse<List<RewardCategoryResponseDto>>), StatusCodes.Status200OK)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminCategoriesListSuccess)]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _categoryService.GetActiveAsync();

            return Ok(new
            {
                success = true,
                data = categories
            });
        }

        [HttpPost("categories")]
        [ProducesResponseType(typeof(ApiResponse<RewardCategoryResponseDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status201Created, SwaggerExamples.AdminCategorySuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
        public async Task<IActionResult> CreateCategory(
            [FromBody] CreateRewardCategoryRequestDto request)
        {
            try
            {
                var category = await _categoryService.CreateAsync(request);

                if (User.TryGetUserId(out int adminId))
                {
                    await _auditLogService.LogAsync(adminId, "CATEGORY_CREATE", "REWARD_CATEGORY", category.CategoryId);
                }

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

        [HttpPut("categories/{categoryId:int}")]
        [ProducesResponseType(typeof(ApiResponse<RewardCategoryResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminCategorySuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
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

            if (User.TryGetUserId(out int adminId))
            {
                await _auditLogService.LogAsync(adminId, "CATEGORY_UPDATE", "REWARD_CATEGORY", categoryId);
            }

            return Ok(new
            {
                success = true,
                data = category
            });
        }

        [HttpPost("categories/{categoryId:int}/archive")]
        [ProducesResponseType(typeof(ApiResponse<CategoryArchiveStatusDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminCategoryArchiveSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
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

            if (User.TryGetUserId(out int adminId))
            {
                await _auditLogService.LogAsync(adminId, "CATEGORY_ARCHIVE", "REWARD_CATEGORY", categoryId);
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

        [HttpPost("categories/{categoryId:int}/unarchive")]
        [ProducesResponseType(typeof(ApiResponse<CategoryArchiveStatusDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminCategoryUnarchiveSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
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

            if (User.TryGetUserId(out int adminId))
            {
                await _auditLogService.LogAsync(adminId, "CATEGORY_UNARCHIVE", "REWARD_CATEGORY", categoryId);
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

        [HttpPost("upload-image")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(ApiResponse<UploadImageResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status413PayloadTooLarge)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status415UnsupportedMediaType)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminUploadImageSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status413PayloadTooLarge, SwaggerExamples.PayloadTooLarge)]
        [SwaggerResponseExample(StatusCodes.Status415UnsupportedMediaType, SwaggerExamples.UnsupportedMediaType)]
        public async Task<IActionResult> UploadImage(
            IFormFile? file,
            [FromQuery] string folder = "rewards")
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    success = false,
                    error = new
                    {
                        code = "VALIDATION_ERROR",
                        message = "File is required."
                    }
                });
            }

            const long maxSizeBytes = 5 * 1024 * 1024;
            if (file.Length > maxSizeBytes)
            {
                return StatusCode(413, new
                {
                    success = false,
                    error = new
                    {
                        code = "PAYLOAD_TOO_LARGE",
                        message = "File size exceeds the allowed limit (5MB)."
                    }
                });
            }

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return StatusCode(415, new
                {
                    success = false,
                    error = new
                    {
                        code = "UNSUPPORTED_MEDIA_TYPE",
                        message = "Only JPEG, PNG and WEBP images are accepted."
                    }
                });
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

        [HttpPut("{itemId:int}")]
        [ProducesResponseType(typeof(ApiResponse<RewardResponseDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminCatalogItemSuccess)]
        [SwaggerResponseExample(StatusCodes.Status400BadRequest, SwaggerExamples.ValidationError)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        public async Task<IActionResult> Update(
            int itemId,
            [FromBody] UpdateRewardRequestDto request)
        {
            try
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

                if (User.TryGetUserId(out int adminId))
                {
                    await _auditLogService.LogAsync(adminId, "CATALOG_UPDATE", "REWARD", itemId);
                }

                return Ok(new
                {
                    success = true,
                    data = result
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

        [HttpPost("{itemId:int}/archive")]
        [ProducesResponseType(typeof(ApiResponse<ItemArchiveStatusDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminItemArchiveSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
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
                        message = "Item is already archived."
                    }
                });
            }

            if (User.TryGetUserId(out int adminId))
            {
                await _auditLogService.LogAsync(adminId, "CATALOG_ARCHIVE", "REWARD", itemId);
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

        [HttpPost("{itemId:int}/unarchive")]
        [ProducesResponseType(typeof(ApiResponse<ItemArchiveStatusDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ApiErrorResponse), StatusCodes.Status409Conflict)]
        [SwaggerResponseExample(StatusCodes.Status200OK, SwaggerExamples.AdminItemUnarchiveSuccess)]
        [SwaggerResponseExample(StatusCodes.Status404NotFound, SwaggerExamples.NotFound)]
        [SwaggerResponseExample(StatusCodes.Status409Conflict, SwaggerExamples.Conflict)]
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

            if (User.TryGetUserId(out int adminId))
            {
                await _auditLogService.LogAsync(adminId, "CATALOG_UNARCHIVE", "REWARD", itemId);
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
    }
}