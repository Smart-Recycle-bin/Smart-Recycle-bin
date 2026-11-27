using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SmartBin.Services;

namespace SmartBin.Common
{
    public class ApiExceptionFilter : IExceptionFilter
    {
        private readonly ILogger<ApiExceptionFilter> _logger;

        public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
        {
            _logger = logger;
        }

        public void OnException(ExceptionContext context)
        {
            if (context.Exception is ApiException apiEx)
            {
                _logger.LogWarning("ApiException handled: {ErrorCode} - {Message} (Status {StatusCode})",
                    apiEx.ErrorCode, apiEx.Message, apiEx.StatusCode);

                var errorPayload = apiEx.Details != null
                    ? new
                    {
                        code = apiEx.ErrorCode,
                        message = apiEx.Message,
                        details = apiEx.Details
                    }
                    : (object)new
                    {
                        code = apiEx.ErrorCode,
                        message = apiEx.Message
                    };

                context.Result = new ObjectResult(new
                {
                    success = false,
                    error = errorPayload
                })
                {
                    StatusCode = apiEx.StatusCode
                };

                context.ExceptionHandled = true;
                return;
            }

            _logger.LogError(context.Exception, "Unhandled server error occurred.");

            context.Result = new ObjectResult(new
            {
                success = false,
                error = new
                {
                    code = "INTERNAL_ERROR",
                    message = "An unexpected server error occurred."
                }
            })
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };

            context.ExceptionHandled = true;
        }
    }
}
