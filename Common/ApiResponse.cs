using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;
using System;

namespace EcoBin.Api;

/// <summary>Builds the JSON shapes every endpoint returns.</summary>
public static class ApiResponse
{
    public static object Ok(object? data) => new { success = true, data };

    public static object Paged(object items, int page, int pageSize, int total, object? summary = null)
    {
        var meta = new { page, pageSize, totalItems = total, totalPages = (int)Math.Ceiling(total / (double)pageSize) };
        return summary is null
            ? new { success = true, data = items, meta }
            : new { success = true, data = items, summary, meta };
    }

    //public static object Error(string code, string message, object? details = null) =>
    //    new { success = false, error = new { code, message, details } };

    public static object Error(string code, string message, object? details = null) =>
    details is null
        ? new { success = false, error = new { code, message } }
        : new { success = false, error = new { code, message, details } };

    /// <summary>Keeps page/pageSize in a safe range.</summary>
    public static (int page, int pageSize) Normalize(int page, int pageSize) =>
        (Math.Max(page, 1), Math.Clamp(pageSize <= 0 ? 10 : pageSize, 1, 100));
}

/// <summary>Throw this from a service to return a clean error to the client.</summary>
public class AppException(int statusCode, string code, string message, object? details = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;
    public object? Details { get; } = details;

    public static AppException NotFound(string message) => new(404, "NOT_FOUND", message);
    public static AppException Conflict(string code, string message) => new(409, code, message);
    public static AppException Validation(string field, string message) =>
        new(400, "VALIDATION_ERROR", "Validation failed.", new[] { new { field, message } });
}

/// <summary>Catches AppException (and any unexpected error) and writes the error JSON.</summary>
public class ErrorMiddleware(RequestDelegate next, ILogger<ErrorMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (AppException ex)
        {
            ctx.Response.StatusCode = ex.StatusCode;
            await ctx.Response.WriteAsJsonAsync(ApiResponse.Error(ex.Code, ex.Message, ex.Details));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled error");
            ctx.Response.StatusCode = 500;
            await ctx.Response.WriteAsJsonAsync(ApiResponse.Error("INTERNAL_ERROR", "Something went wrong."));
        }
    }
}
