using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;

namespace SmartBin.Services
{
    public class CloudflareR2StorageService : IStorageService
    {
        private readonly IConfiguration _configuration;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<CloudflareR2StorageService> _logger;

        // Allowed MIME signatures (magic bytes)
        private static readonly (byte[] Magic, string Mime)[] _allowedSignatures =
        [
            (new byte[] { 0xFF, 0xD8, 0xFF }, "image/jpeg"),
            (new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }, "image/png"),
            // WEBP: "RIFF????WEBP"
            (new byte[] { 0x52, 0x49, 0x46, 0x46 }, "image/webp"),
        ];

        private const int MaxPhotoBytes = 4 * 1024 * 1024; // 4 MB
        private const int MaxDimension  = 4096;

        public CloudflareR2StorageService(
            IConfiguration configuration,
            IWebHostEnvironment environment,
            ILogger<CloudflareR2StorageService> logger)
        {
            _configuration = configuration;
            _environment   = environment;
            _logger        = logger;
        }

        // ── Upload with explicit key (overwrites) ─────────────────────────────

        public async Task<string> UploadFileWithKeyAsync(Stream fileStream, string key, string contentType)
        {
            var accountId       = _configuration["CloudflareR2:AccountId"];
            var accessKeyId     = _configuration["CloudflareR2:AccessKeyId"];
            var secretAccessKey = _configuration["CloudflareR2:SecretAccessKey"];
            var bucketName      = _configuration["CloudflareR2:BucketName"]    ?? "ecobin";
            var publicBaseUrl   = _configuration["CloudflareR2:PublicBaseUrl"] ?? "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev";

            if (!string.IsNullOrWhiteSpace(accountId) &&
                !string.IsNullOrWhiteSpace(accessKeyId) &&
                !string.IsNullOrWhiteSpace(secretAccessKey) &&
                accessKeyId.Length == 32)
            {
                var serviceUrl  = $"https://{accountId}.r2.cloudflarestorage.com";
                var credentials = new BasicAWSCredentials(accessKeyId, secretAccessKey);
                var config      = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };

                using var s3Client = new AmazonS3Client(credentials, config);

                var putRequest = new PutObjectRequest
                {
                    BucketName            = bucketName,
                    Key                   = key,
                    InputStream           = fileStream,
                    ContentType           = contentType,
                    DisablePayloadSigning = true
                };

                await s3Client.PutObjectAsync(putRequest);
                return $"{publicBaseUrl.TrimEnd('/')}/{key}";
            }

            // Local fallback
            _logger.LogWarning("Cloudflare R2 credentials are missing or invalid. Falling back to local disk storage.");
            var rootPath  = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var localPath = Path.Combine(rootPath, "uploads", key.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);

            fileStream.Seek(0, SeekOrigin.Begin);
            using var localStream = new FileStream(localPath, FileMode.Create);
            await fileStream.CopyToAsync(localStream);

            return $"{publicBaseUrl.TrimEnd('/')}/{key}";
        }

        // ── Upload ────────────────────────────────────────────────────────────

        public async Task<string> UploadFileAsync(IFormFile file, string folder = "rewards")
        {
            var uniqueFileName = $"{folder}/{Guid.NewGuid():N}.jpg";

            var accountId       = _configuration["CloudflareR2:AccountId"];
            var accessKeyId     = _configuration["CloudflareR2:AccessKeyId"];
            var secretAccessKey = _configuration["CloudflareR2:SecretAccessKey"];
            var bucketName      = _configuration["CloudflareR2:BucketName"]    ?? "ecobin";
            var publicBaseUrl   = _configuration["CloudflareR2:PublicBaseUrl"] ?? "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev";

            if (!string.IsNullOrWhiteSpace(accountId) &&
                !string.IsNullOrWhiteSpace(accessKeyId) &&
                !string.IsNullOrWhiteSpace(secretAccessKey) &&
                accessKeyId.Length == 32)
            {
                var serviceUrl  = $"https://{accountId}.r2.cloudflarestorage.com";
                var credentials = new BasicAWSCredentials(accessKeyId, secretAccessKey);
                var config      = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };

                using var s3Client   = new AmazonS3Client(credentials, config);
                using var imageBytes = await StripExifAndReencodeAsync(file);

                var putRequest = new PutObjectRequest
                {
                    BucketName            = bucketName,
                    Key                   = uniqueFileName,
                    InputStream           = imageBytes,
                    ContentType           = "image/jpeg",
                    DisablePayloadSigning = true
                };

                await s3Client.PutObjectAsync(putRequest);
                return $"{publicBaseUrl.TrimEnd('/')}/{uniqueFileName}";
            }

            // Fallback: local disk
            _logger.LogWarning("Cloudflare R2 credentials are missing or invalid. Falling back to local disk storage.");
            var rootPath      = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsFolder = Path.Combine(rootPath, "uploads", folder);
            Directory.CreateDirectory(uploadsFolder);
            var localFile = Path.Combine(uploadsFolder, $"{Guid.NewGuid():N}.jpg");

            using var localStream = new FileStream(localFile, FileMode.Create);
            using var encoded     = await StripExifAndReencodeAsync(file);
            await encoded.CopyToAsync(localStream);

            return $"{publicBaseUrl.TrimEnd('/')}/{uniqueFileName}";
        }

        // ── Delete ────────────────────────────────────────────────────────────

        public async Task DeleteFileAsync(string publicUrl)
        {
            try
            {
                var accountId       = _configuration["CloudflareR2:AccountId"];
                var accessKeyId     = _configuration["CloudflareR2:AccessKeyId"];
                var secretAccessKey = _configuration["CloudflareR2:SecretAccessKey"];
                var bucketName      = _configuration["CloudflareR2:BucketName"]  ?? "ecobin";
                var publicBaseUrl   = _configuration["CloudflareR2:PublicBaseUrl"] ?? "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev";

                if (string.IsNullOrWhiteSpace(publicUrl)) return;

                // Derive the S3 key from the public URL
                var baseUrl = publicBaseUrl.TrimEnd('/') + "/";
                if (!publicUrl.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase)) return;

                var key = publicUrl[baseUrl.Length..];

                if (!string.IsNullOrWhiteSpace(accountId) &&
                    !string.IsNullOrWhiteSpace(accessKeyId) &&
                    !string.IsNullOrWhiteSpace(secretAccessKey) &&
                    accessKeyId.Length == 32)
                {
                    var serviceUrl  = $"https://{accountId}.r2.cloudflarestorage.com";
                    var credentials = new BasicAWSCredentials(accessKeyId, secretAccessKey);
                    var config      = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };

                    using var s3Client = new AmazonS3Client(credentials, config);
                    await s3Client.DeleteObjectAsync(bucketName, key);
                }
                else
                {
                    // Local fallback: delete the physical file
                    var rootPath  = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var localPath = Path.Combine(rootPath, "uploads", key.Replace('/', Path.DirectorySeparatorChar));
                    if (File.Exists(localPath)) File.Delete(localPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete storage file '{Url}' (best-effort).", publicUrl);
            }
        }

        // ── Validation helpers ────────────────────────────────────────────────

        /// <summary>
        /// Validates real MIME type from magic bytes, enforces 4 MB and 4096×4096 limits,
        /// then strips EXIF and re-encodes to JPEG — returns a fresh MemoryStream.
        /// Throws <see cref="ApiException"/> on any violation.
        /// </summary>
        public static async Task<MemoryStream> StripExifAndReencodeAsync(IFormFile file)
        {
            // Size check (also caught by the request size filter, but defence-in-depth)
            if (file.Length > MaxPhotoBytes)
                throw new ApiException("PAYLOAD_TOO_LARGE", "The photo must be 4 MB or smaller.", 413);

            // Read bytes for magic-byte inspection
            using var rawStream = file.OpenReadStream();
            var header = new byte[12];
            var headerRead = await rawStream.ReadAsync(header.AsMemory(0, header.Length));
            rawStream.Seek(0, SeekOrigin.Begin);

            // Validate MIME from magic bytes
            var detectedMime = DetectMime(header, headerRead);
            if (detectedMime == null)
                throw new ApiException("UNSUPPORTED_MEDIA_TYPE",
                    "Only JPEG, PNG and WEBP images are accepted. HEIC is not supported.", 415);

            // For WEBP: verify "WEBP" at byte 8 (after "RIFF????")
            if (detectedMime == "image/webp" && headerRead >= 12)
            {
                var webpSig = System.Text.Encoding.ASCII.GetString(header, 8, 4);
                if (webpSig != "WEBP")
                    throw new ApiException("UNSUPPORTED_MEDIA_TYPE",
                        "Only JPEG, PNG and WEBP images are accepted.", 415);
            }

            // Load via ImageSharp (auto-detects HEIC → throws, confirms format)
            Image image;
            try
            {
                image = await Image.LoadAsync(rawStream);
            }
            catch (UnknownImageFormatException)
            {
                throw new ApiException("UNSUPPORTED_MEDIA_TYPE",
                    "Only JPEG, PNG and WEBP images are accepted. HEIC is not supported.", 415);
            }

            using (image)
            {
                // Dimension guard
                if (image.Width > MaxDimension || image.Height > MaxDimension)
                    throw new ApiException("VALIDATION_ERROR",
                        $"Image dimensions must not exceed {MaxDimension}×{MaxDimension} pixels.", 400);

                // Strip EXIF / GPS metadata
                image.Metadata.ExifProfile = null;
                image.Metadata.IptcProfile = null;
                image.Metadata.XmpProfile  = null;

                // Re-encode to JPEG (strips all metadata channels, normalises format)
                var output = new MemoryStream();
                await image.SaveAsJpegAsync(output, new JpegEncoder { Quality = 90 });
                output.Seek(0, SeekOrigin.Begin);
                return output;
            }
        }

        private static string? DetectMime(byte[] header, int bytesRead)
        {
            foreach (var (magic, mime) in _allowedSignatures)
            {
                if (bytesRead < magic.Length) continue;
                bool match = true;
                for (int i = 0; i < magic.Length; i++)
                {
                    if (header[i] != magic[i]) { match = false; break; }
                }
                if (match) return mime;
            }
            return null;
        }
    }
}

