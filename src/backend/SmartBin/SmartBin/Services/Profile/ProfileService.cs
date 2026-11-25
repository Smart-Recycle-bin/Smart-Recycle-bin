using Microsoft.AspNetCore.Identity;
using SmartBin.DTOs.Profile;
using SmartBin.Models;
using SmartBin.Repositories.Wallet;

namespace SmartBin.Services.Profile
{
    public class ProfileService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IWalletRepository _walletRepository;
        private readonly IStorageService _storageService;

        public ProfileService(
            UserManager<ApplicationUser> userManager,
            IWalletRepository walletRepository,
            IStorageService storageService)
        {
            _userManager      = userManager;
            _walletRepository = walletRepository;
            _storageService   = storageService;
        }

        // ── GET ───────────────────────────────────────────────────────────────

        public async Task<ProfileResponseDto> GetProfileAsync(int userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
            {
                throw new ApiException(
                    "USER_NOT_FOUND",
                    "User account was not found.",
                    404
                );
            }

            var roles = await _userManager.GetRolesAsync(user);
            var role  = roles.FirstOrDefault();

            var walletPoints = await _walletRepository.GetAvailablePointsAsync(user.Id);

            return new ProfileResponseDto
            {
                UserId          = user.Id,
                Email           = user.Email ?? string.Empty,
                DisplayName     = user.DisplayName,
                PhoneNumber     = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhoto,
                Role            = role ?? string.Empty,
                Points          = walletPoints
            };
        }

        // ── UPDATE ────────────────────────────────────────────────────────────

        public async Task<UpdateProfileResponseDto> UpdateProfileAsync(
            int userId,
            UpdateProfileRequestDto request)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString())
                       ?? throw new ApiException("USER_NOT_FOUND", "User account was not found.", 404);

            // ── 1. Display name ───────────────────────────────────────────────
            if (request.DisplayName is not null)
                user.DisplayName = request.DisplayName.Trim();

            // ── 2. Phone number ───────────────────────────────────────────────
            if (request.PhoneNumber is not null)
            {
                var phoneResult = await _userManager.SetPhoneNumberAsync(user, request.PhoneNumber.Trim());
                if (!phoneResult.Succeeded)
                    throw new ApiException("VALIDATION_ERROR",
                        string.Join("; ", phoneResult.Errors.Select(e => e.Description)), 400);
            }

            // ── 3. Photo handling ─────────────────────────────────────────────
            if (request.RemovePhoto)
            {
                if (!string.IsNullOrWhiteSpace(user.ProfilePhoto))
                    await _storageService.DeleteFileAsync(user.ProfilePhoto);

                user.ProfilePhoto = null;
            }
            else if (request.Photo is not null)
            {
                using var encodedStream =
                    await CloudflareR2StorageService.StripExifAndReencodeAsync(request.Photo);

                var key = $"profiles/{userId}.jpg";
                var newPhotoUrl = await _storageService.UploadFileWithKeyAsync(
                    encodedStream, key, "image/jpeg");

                var existingCleanUrl = user.ProfilePhoto?.Split('?', 2)[0];
                var newCleanUrl = newPhotoUrl.Split('?', 2)[0];

                if (!string.IsNullOrWhiteSpace(existingCleanUrl) &&
                    !string.Equals(existingCleanUrl, newCleanUrl, StringComparison.OrdinalIgnoreCase))
                {
                    await _storageService.DeleteFileAsync(user.ProfilePhoto!);
                }

                user.ProfilePhoto = $"{newCleanUrl}?v={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
            }
            else if (!string.IsNullOrWhiteSpace(request.ProfilePhotoUrl))
            {
                user.ProfilePhoto = request.ProfilePhotoUrl;
            }

            // ── 4. Persist ────────────────────────────────────────────────────
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
                throw new ApiException("UPDATE_FAILED",
                    string.Join("; ", updateResult.Errors.Select(e => e.Description)), 500);

            return new UpdateProfileResponseDto
            {
                UserId          = user.Id,
                DisplayName     = user.DisplayName,
                PhoneNumber     = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhoto
            };
        }
    }
}
