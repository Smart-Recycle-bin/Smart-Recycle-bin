namespace SmartBin.Common.Swagger
{
    /// <summary>
    /// Attaches a concrete JSON response payload example for Swagger/OpenAPI documentation.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
    public sealed class SwaggerResponseExampleAttribute : Attribute
    {
        public int StatusCode { get; }
        public string ExampleJson { get; }
        public string? Description { get; }

        public SwaggerResponseExampleAttribute(int statusCode, string exampleJson, string? description = null)
        {
            StatusCode = statusCode;
            ExampleJson = exampleJson;
            Description = description;
        }
    }
}
