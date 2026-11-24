
using Microsoft.AspNetCore.Identity;
using SmartBin.DTOs.Profile;
using SmartBin.Models;

namespace SmartBin.Services.Profile
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

    

    }
}
