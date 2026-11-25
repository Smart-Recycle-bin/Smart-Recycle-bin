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

        public ProfileService(
            UserManager<ApplicationUser> userManager,
            IWalletRepository walletRepository)
        {
            _userManager = userManager;
            _walletRepository = walletRepository;
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

            var walletPoints = await _walletRepository.GetAvailablePointsAsync(user.Id);

            return new ProfileResponseDto
            {
                UserId = user.Id,
                Email = user.Email ?? string.Empty,
                DisplayName = user.DisplayName,
                PhoneNumber = user.PhoneNumber,
                ProfilePhotoUrl = user.ProfilePhoto,
                Role = role ?? string.Empty,
                Points = walletPoints
            };
        }

        public async Task<ProfileResponseDto> UpdateProfileAsync(int userId, UpdateProfileRequestDto request)
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

            user.DisplayName = request.DisplayName;
            if (request.PhoneNumber != null)
            {
                user.PhoneNumber = request.PhoneNumber;
            }
            if (!string.IsNullOrWhiteSpace(request.ProfilePhotoUrl))
            {
                user.ProfilePhoto = request.ProfilePhotoUrl;
            }

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                throw new ApiException(
                    "UPDATE_PROFILE_FAILED",
                    "Failed to update user profile.",
                    400
                );
            }

            return await GetProfileAsync(userId);
        }
    }
}
