
namespace SmartBin.Services
{
    public class ApiException : Exception
    {
        public string ErrorCode { get; }
        public int StatusCode { get; }

        public ApiException(
            string errorCode,
            string message,
            int statusCode)
            : base(message)
        {
            ErrorCode = errorCode;
            StatusCode = statusCode;
        }
    }
}

