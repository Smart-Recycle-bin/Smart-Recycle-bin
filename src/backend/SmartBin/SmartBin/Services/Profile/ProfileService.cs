
using Microsoft.AspNetCore.Identity;
using SmartBin.DTOs.Profile;
using SmartBin.Models;

namespace SmartBin.Services.Profile
{
    public class ProfileService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IStorageService _storageService;

        public ProfileService(
            UserManager<ApplicationUser> userManager,
            IStorageService storageService)
        {
            _userManager    = userManager;
            _storageService = storageService;
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

            return new ProfileResponseDto
            {
                UserId          = user.Id,
                Email           = user.Email!,
                DisplayName     = user.DisplayName,
                PhoneNumber     = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhoto,
                Role            = role ?? string.Empty
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
                // UserManager handles setting PhoneNumber
                var phoneResult = await _userManager.SetPhoneNumberAsync(user, request.PhoneNumber.Trim());
                if (!phoneResult.Succeeded)
                    throw new ApiException("VALIDATION_ERROR",
                        string.Join("; ", phoneResult.Errors.Select(e => e.Description)), 400);
            }

            // ── 3. Photo handling ─────────────────────────────────────────────
            if (request.RemovePhoto)
            {
                // Delete old photo from storage (best-effort)
                if (!string.IsNullOrWhiteSpace(user.ProfilePhoto))
                    await _storageService.DeleteFileAsync(user.ProfilePhoto);

                user.ProfilePhoto = null;
            }
            else if (request.Photo is not null)
            {
                // Validate + re-encode (throws ApiException on bad file)
                using var encodedStream =
                    await CloudflareR2StorageService.StripExifAndReencodeAsync(request.Photo);

                // Fixed key per user — uploading overwrites the old photo automatically.
                var key = $"profiles/{userId}.jpg";
                var newPhotoUrl = await _storageService.UploadFileWithKeyAsync(
                    encodedStream, key, "image/jpeg");

                // If the user had an older photo at a different key (e.g. GUID-based), remove it
                if (!string.IsNullOrWhiteSpace(user.ProfilePhoto) &&
                    !string.Equals(user.ProfilePhoto, newPhotoUrl, StringComparison.OrdinalIgnoreCase))
                {
                    await _storageService.DeleteFileAsync(user.ProfilePhoto);
                }

                user.ProfilePhoto = newPhotoUrl;
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

