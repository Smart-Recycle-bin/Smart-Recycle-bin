namespace SmartBin.Services
{
    public interface IStorageService
    {
        Task<string> UploadFileAsync(IFormFile file, string folder = "rewards");
    }
}
