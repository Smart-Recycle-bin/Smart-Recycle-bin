
namespace SmartBin.Services
{
    public class ApiException : Exception
    {
        public string ErrorCode { get; }
        public int StatusCode { get; }
        public object? Details { get; }

        public ApiException(
            string errorCode,
            string message,
            int statusCode)
            : base(message)
        { 
            ErrorCode = errorCode;
            StatusCode = statusCode;
        }

        public ApiException(
            int statusCode,
            string errorCode,
            string message,
            object? details = null)
            : base(message)
        {
            StatusCode = statusCode;
            ErrorCode = errorCode;
            Details = details;
        }
    }
}

