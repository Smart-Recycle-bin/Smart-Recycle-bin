using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace SmartBin.Services
{
    public class CloudflareR2StorageService : IStorageService
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<CloudflareR2StorageService> _logger;

        public CloudflareR2StorageService(
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<CloudflareR2StorageService> logger)
        {
            _configuration = configuration;
            _environment = environment;
            _logger = logger;
        }

        public async Task<string> UploadFileAsync(IFormFile file, string folder = "rewards")
        {
            var accountId = _configuration["CloudflareR2:AccountId"];
            var accessKeyId = _configuration["CloudflareR2:AccessKeyId"];
            var secretAccessKey = _configuration["CloudflareR2:SecretAccessKey"];
            var bucketName = _configuration["CloudflareR2:BucketName"] ?? "ecobin";
            var publicBaseUrl = _configuration["CloudflareR2:PublicBaseUrl"] ?? "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev";

            var fileExt = Path.GetExtension(file.FileName).ToLowerInvariant();
            var uniqueFileName = $"{folder}/{Guid.NewGuid():N}{fileExt}";

            // If credentials are valid R2 S3 keys (AccessKey is 32 chars)
            if (!string.IsNullOrWhiteSpace(accountId) &&
                !string.IsNullOrWhiteSpace(accessKeyId) &&
                !string.IsNullOrWhiteSpace(secretAccessKey) &&
                accessKeyId.Length == 32)
            {
                var serviceUrl = $"https://{accountId}.r2.cloudflarestorage.com";
                var credentials = new BasicAWSCredentials(accessKeyId, secretAccessKey);
                var config = new AmazonS3Config
                {
                    ServiceURL = serviceUrl,
                    ForcePathStyle = true
                };

                using var s3Client = new AmazonS3Client(credentials, config);
                using var stream = file.OpenReadStream();

                var putRequest = new PutObjectRequest
                {
                    BucketName = bucketName,
                    Key = uniqueFileName,
                    InputStream = stream,
                    ContentType = file.ContentType,
                    DisablePayloadSigning = true
                };

                await s3Client.PutObjectAsync(putRequest);
                return $"{publicBaseUrl.TrimEnd('/')}/{uniqueFileName}";
            }

            // Fallback: save to local storage if R2 S3 keys are not yet provided
            _logger.LogWarning("Cloudflare R2 AccessKeyId is missing or invalid. Falling back to local disk storage.");
            var rootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(rootPath, "uploads", folder);
            Directory.CreateDirectory(uploadsFolder);
            var localPath = Path.Combine(uploadsFolder, $"{Guid.NewGuid():N}{fileExt}");

            using (var fileStream = new FileStream(localPath, FileMode.Create))
            {
                await file.CopyToAsync(fileStream);
            }

            return $"{publicBaseUrl.TrimEnd('/')}/{uniqueFileName}";
        }
    }
}
