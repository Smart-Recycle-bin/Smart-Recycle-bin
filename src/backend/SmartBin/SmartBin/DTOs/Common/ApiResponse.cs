using System.Text.Json.Serialization;

namespace SmartBin.DTOs.Common
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public PaginationMeta? Meta { get; set; }
    }

    public class PagedApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
        public PaginationMeta Meta { get; set; } = new();
    }

    public class PaginationMeta
    {
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public int TotalPages { get; set; }
    }

    public class ApiErrorResponse
    {
        public bool Success { get; set; } = false;
        public ApiErrorDetails Error { get; set; } = new();
    }

    public class ApiErrorDetails
    {
        public string Code { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;

        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<ValidationErrorDetail>? Details { get; set; }
    }

    public class ValidationErrorDetail
    {
        public string Field { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }

    public class UploadImageResponseDto
    {
        public string ImageUrl { get; set; } = string.Empty;
    }

    public class ItemArchiveStatusDto
    {
        public int ItemId { get; set; }
        public string Status { get; set; } = "archived";
    }

    public class CategoryArchiveStatusDto
    {
        public int CategoryId { get; set; }
        public string Status { get; set; } = "archived";
        public DateTime? ArchivedAt { get; set; }
    }
}
