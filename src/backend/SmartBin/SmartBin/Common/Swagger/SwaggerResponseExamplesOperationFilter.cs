using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace SmartBin.Common.Swagger
{
    /// <summary>
    /// Populates OpenAPI response media-type examples from [SwaggerResponseExample] attributes
    /// and ensures consistent 401/403 examples on authorized endpoints.
    /// </summary>
    public sealed class SwaggerResponseExamplesOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            operation.Responses ??= new OpenApiResponses();

            var attributes = context.MethodInfo
                .GetCustomAttributes(typeof(SwaggerResponseExampleAttribute), inherit: true)
                .OfType<SwaggerResponseExampleAttribute>()
                .ToList();

            foreach (var attr in attributes)
            {
                ApplyExample(operation, attr.StatusCode, attr.ExampleJson, attr.Description);
            }

            var hasAllowAnonymous = context.MethodInfo
                .GetCustomAttributes(typeof(AllowAnonymousAttribute), inherit: true)
                .Any();

            if (!hasAllowAnonymous)
            {
                var methodAuth = context.MethodInfo
                    .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                    .OfType<AuthorizeAttribute>()
                    .ToList();

                var controllerAuth = context.MethodInfo.DeclaringType?
                    .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
                    .OfType<AuthorizeAttribute>()
                    .ToList() ?? new List<AuthorizeAttribute>();

                var allAuth = methodAuth.Concat(controllerAuth).ToList();
                if (allAuth.Count > 0)
                {
                    if (!operation.Responses.ContainsKey("401"))
                    {
                        ApplyExample(operation, StatusCodes.Status401Unauthorized, SwaggerExamples.Unauthorized, "Unauthorized");
                    }

                    if (allAuth.Any(a => !string.IsNullOrWhiteSpace(a.Roles)) && !operation.Responses.ContainsKey("403"))
                    {
                        ApplyExample(operation, StatusCodes.Status403Forbidden, SwaggerExamples.Forbidden, "Forbidden");
                    }
                }
            }
        }

        private static void ApplyExample(OpenApiOperation operation, int statusCode, string exampleJson, string? description)
        {
            var key = statusCode.ToString();
            if (!operation.Responses!.TryGetValue(key, out var response) || response is not OpenApiResponse concreteResponse)
            {
                concreteResponse = new OpenApiResponse
                {
                    Description = description ?? ReasonPhrases.GetReasonPhrase(statusCode)
                };
                operation.Responses[key] = concreteResponse;
            }
            else if (string.IsNullOrWhiteSpace(concreteResponse.Description))
            {
                concreteResponse.Description = description ?? ReasonPhrases.GetReasonPhrase(statusCode);
            }

            concreteResponse.Content ??= new Dictionary<string, OpenApiMediaType>();

            if (!concreteResponse.Content.TryGetValue("application/json", out var concreteMediaType) ||
                concreteMediaType is null)
            {
                concreteMediaType = new OpenApiMediaType();
                concreteResponse.Content["application/json"] = concreteMediaType;
            }

            concreteMediaType.Example = JsonNode.Parse(exampleJson);
            concreteMediaType.Examples ??= new Dictionary<string, IOpenApiExample>();
            concreteMediaType.Examples["default"] = new OpenApiExample
            {
                Summary = description ?? ReasonPhrases.GetReasonPhrase(statusCode),
                Value = JsonNode.Parse(exampleJson)
            };
        }
    }
}
