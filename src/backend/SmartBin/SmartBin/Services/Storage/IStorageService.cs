namespace SmartBin.Services
{
    public interface IStorageService
    {
        /// <summary>Uploads a file with a random GUID key and returns the public URL.</summary>
        Task<string> UploadFileAsync(IFormFile file, string folder = "rewards");

        /// <summary>
        /// Uploads a file using an explicit storage key (e.g. "profiles/42.jpg").
        /// Overwrites any existing object at that key.
        /// Returns the public URL.
        /// </summary>
        Task<string> UploadFileWithKeyAsync(Stream fileStream, string key, string contentType);

        /// <summary>
        /// Deletes a file by its public URL (best-effort; never throws).
        /// </summary>
        Task DeleteFileAsync(string publicUrl);
    }
}

