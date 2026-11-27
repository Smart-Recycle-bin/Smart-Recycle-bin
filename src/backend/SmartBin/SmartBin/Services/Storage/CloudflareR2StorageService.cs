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
        private readonly IHttpContextAccessor _httpContextAccessor;
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
            IHttpContextAccessor httpContextAccessor,
            ILogger<CloudflareR2StorageService> logger)
        {
            _configuration       = configuration;
            _environment         = environment;
            _httpContextAccessor = httpContextAccessor;
            _logger              = logger;
        }

        // ── Configuration helpers ─────────────────────────────────────────────

        private sealed record R2StorageOptions(
            string AccountId,
            string AccessKeyId,
            string SecretAccessKey,
            string BucketName,
            string PublicBaseUrl);

        private bool TryReadStorageOptions(out R2StorageOptions? options)
        {
            var accountId       = _configuration["CloudflareR2:AccountId"]?.Trim();
            var accessKeyId     = _configuration["CloudflareR2:AccessKeyId"]?.Trim();
            var secretAccessKey = _configuration["CloudflareR2:SecretAccessKey"]?.Trim();
            var bucketName      = _configuration["CloudflareR2:BucketName"]?.Trim();
            var publicBaseUrl   = _configuration["CloudflareR2:PublicBaseUrl"]?.Trim();

            if (string.IsNullOrWhiteSpace(accountId) ||
                string.IsNullOrWhiteSpace(accessKeyId) ||
                accessKeyId.Length != 32 ||
                string.IsNullOrWhiteSpace(secretAccessKey) ||
                string.IsNullOrWhiteSpace(bucketName) ||
                string.IsNullOrWhiteSpace(publicBaseUrl) ||
                !Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var baseUri) ||
                baseUri.Scheme != Uri.UriSchemeHttps)
            {
                options = null;
                return false;
            }

            options = new R2StorageOptions(
                accountId,
                accessKeyId,
                secretAccessKey,
                bucketName,
                publicBaseUrl.TrimEnd('/'));
            return true;
        }

        private R2StorageOptions GetRequiredStorageOptions()
        {
            if (TryReadStorageOptions(out var options) && options is not null)
            {
                return options;
            }

            _logger.LogError(
                "Cloudflare R2 storage configuration is missing or incomplete. Required keys: CloudflareR2:AccountId, CloudflareR2:AccessKeyId, CloudflareR2:SecretAccessKey, CloudflareR2:BucketName, CloudflareR2:PublicBaseUrl.");

            throw new ApiException(
                StatusCodes.Status503ServiceUnavailable,
                "STORAGE_NOT_CONFIGURED",
                "Object storage is not configured. Configure CloudflareR2 settings.");
        }

        private static AmazonS3Client CreateS3Client(R2StorageOptions options)
        {
            var serviceUrl  = $"https://{options.AccountId}.r2.cloudflarestorage.com";
            var credentials = new BasicAWSCredentials(options.AccessKeyId, options.SecretAccessKey);
            var config      = new AmazonS3Config { ServiceURL = serviceUrl, ForcePathStyle = true };
            return new AmazonS3Client(credentials, config);
        }

        // ── Upload with explicit key (overwrites) ─────────────────────────────

        public async Task<string> UploadFileWithKeyAsync(Stream fileStream, string key, string contentType)
        {
            var options = GetRequiredStorageOptions();

            using var s3Client = CreateS3Client(options);

            var putRequest = new PutObjectRequest
            {
                BucketName            = options.BucketName,
                Key                   = key,
                InputStream           = fileStream,
                ContentType           = contentType,
                DisablePayloadSigning = true
            };

            await s3Client.PutObjectAsync(putRequest);
            return $"{options.PublicBaseUrl}/{key}";
        }

        // ── Upload ────────────────────────────────────────────────────────────

        public async Task<string> UploadFileAsync(IFormFile file, string folder = "rewards")
        {
            var normalizedFolder = string.IsNullOrWhiteSpace(folder)
                ? "rewards"
                : folder.Trim('/').ToLowerInvariant();

            if (normalizedFolder.Contains("..", StringComparison.Ordinal) ||
                normalizedFolder.Contains('/') ||
                normalizedFolder.Contains('\\'))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid upload folder.");
            }

            using var imageBytes = await StripExifAndReencodeAsync(file);

            var fileName = $"{Guid.NewGuid():N}.jpg";
            var uniqueFileName = $"{normalizedFolder}/{fileName}";

            if (TryReadStorageOptions(out var options) && options is not null)
            {
                using var s3Client = CreateS3Client(options);

                var putRequest = new PutObjectRequest
                {
                    BucketName            = options.BucketName,
                    Key                   = uniqueFileName,
                    InputStream           = imageBytes,
                    ContentType           = "image/jpeg",
                    DisablePayloadSigning = true
                };

                try
                {
                    await s3Client.PutObjectAsync(putRequest);
                    return $"{options.PublicBaseUrl}/{uniqueFileName}";
                }
                catch (AmazonS3Exception ex)
                {
                    _logger.LogError(
                        "Cloudflare R2 upload failed with status {StatusCode} and error code {ErrorCode} for bucket '{BucketName}'.",
                        (int)ex.StatusCode,
                        ex.ErrorCode,
                        options.BucketName);

                    throw new ApiException(
                        StatusCodes.Status502BadGateway,
                        "STORAGE_UPLOAD_FAILED",
                        "Failed to upload image to object storage.");
                }
                catch (HttpRequestException)
                {
                    _logger.LogError(
                        "Cloudflare R2 upload failed due to a network error for bucket '{BucketName}'.",
                        options.BucketName);

                    throw new ApiException(
                        StatusCodes.Status502BadGateway,
                        "STORAGE_UPLOAD_FAILED",
                        "Failed to upload image to object storage.");
                }
            }

            if (_environment.IsDevelopment())
            {
                _logger.LogWarning(
                    "Cloudflare R2 storage is not configured. Using Development-only local storage under wwwroot/uploads/{Folder}.",
                    normalizedFolder);

                var uploadsRoot = GetLocalUploadsRoot();
                var targetFolder = Path.Combine(uploadsRoot, normalizedFolder);
                Directory.CreateDirectory(targetFolder);

                var localFilePath = Path.Combine(targetFolder, fileName);
                await using var localStream = new FileStream(localFilePath, FileMode.Create, FileAccess.Write, FileShare.None);
                await imageBytes.CopyToAsync(localStream);

                var request = _httpContextAccessor.HttpContext?.Request;
                if (request is not null && request.Host.HasValue)
                {
                    var originBase = $"{request.Scheme}://{request.Host}{request.PathBase}".TrimEnd('/');
                    return $"{originBase}/uploads/{uniqueFileName}";
                }

                return $"/uploads/{uniqueFileName}";
            }

            // Non-Development environments fail closed when Cloudflare R2 is not configured.
            _ = GetRequiredStorageOptions();
            throw new InvalidOperationException("Unreachable.");
        }

        // ── Delete ────────────────────────────────────────────────────────────

        public async Task DeleteFileAsync(string publicUrl)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(publicUrl)) return;

                // Strip any query string before deriving the S3 key or local path
                var cleanUrl = publicUrl.Split('?', 2)[0];

                if (TryReadStorageOptions(out var options) && options is not null)
                {
                    var baseUrl = options.PublicBaseUrl + "/";
                    if (cleanUrl.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase))
                    {
                        var key = cleanUrl[baseUrl.Length..];
                        using var s3Client = CreateS3Client(options);
                        await s3Client.DeleteObjectAsync(options.BucketName, key);
                        return;
                    }
                }

                if (_environment.IsDevelopment())
                {
                    string? relativeUploadPath = null;
                    if (Uri.TryCreate(cleanUrl, UriKind.Absolute, out var absoluteUri) &&
                        absoluteUri.AbsolutePath.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
                    {
                        relativeUploadPath = absoluteUri.AbsolutePath["/uploads/".Length..];
                    }
                    else if (cleanUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
                    {
                        relativeUploadPath = cleanUrl["/uploads/".Length..];
                    }

                    if (!string.IsNullOrWhiteSpace(relativeUploadPath))
                    {
                        var uploadsRoot = Path.GetFullPath(GetLocalUploadsRoot());
                        var candidatePath = Path.GetFullPath(
                            Path.Combine(uploadsRoot, relativeUploadPath.Replace('/', Path.DirectorySeparatorChar)));

                        if (candidatePath.StartsWith(uploadsRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase) &&
                            File.Exists(candidatePath))
                        {
                            File.Delete(candidatePath);
                        }
                        return;
                    }
                }

                if (!TryReadStorageOptions(out _))
                {
                    _logger.LogWarning(
                        "Cloudflare R2 storage configuration is missing or incomplete; skipping deletion for '{Url}'.",
                        publicUrl);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete storage file '{Url}' (best-effort).", publicUrl);
            }
        }

        private string GetLocalUploadsRoot()
        {
            var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;

            return Path.Combine(webRoot, "uploads");
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

