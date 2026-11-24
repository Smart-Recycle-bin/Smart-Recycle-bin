
using Microsoft.AspNetCore.Identity;
using SmartBin.DTOs.Profile;
using SmartBin.Models;

namespace SmartBin.Services
{
    public class ProfileService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public ProfileService(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

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
            var role = roles.FirstOrDefault();

            return new ProfileResponseDto
            {
                UserId = user.Id,
                Email = user.Email!,
                DisplayName = user.DisplayName,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhoto,
                Role = role ?? string.Empty
            };
        }

        public async Task<UpdateProfileResponseDto> UpdateProfileAsync(
            int userId,
            UpdateProfileRequestDto request)
        {
            // 1. Find current user
            var user = await _userManager.FindByIdAsync(userId.ToString());

            if (user == null)
            {
                throw new ApiException(
                    "USER_NOT_FOUND",
                    "User account was not found.",
                    404
                );
            }

            // 2. Validate display name
            if (string.IsNullOrWhiteSpace(request.DisplayName))
            {
                throw new ApiException(
                    "VALIDATION_ERROR",
                    "Display name is required.",
                    400
                );
            }

            // 3. Update editable fields only
            user.DisplayName = request.DisplayName.Trim();
            user.PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber)
                ? null
                : request.PhoneNumber.Trim();

            // 4. Save changes
            var result = await _userManager.UpdateAsync(user);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));

                throw new ApiException(
                    "VALIDATION_ERROR",
                    errors,
                    400
                );
            }

            // 5. Return updated profile
            return new UpdateProfileResponseDto
            {
                UserId = user.Id,
                DisplayName = user.DisplayName,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhoto
            };
        }

    }
}
