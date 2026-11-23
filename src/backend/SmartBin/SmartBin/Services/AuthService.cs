using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using SmartBin.Context;
using SmartBin.Dtos.Auth;
using SmartBin.DTOs.Auth;
using SmartBin.Models;
using SmartBin.Repositories;
 using System.Security.Cryptography;
using System.Text;

namespace SmartBin.Services
{
    public class AuthService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JwtService _jwtService;
        private readonly RefreshTokenRepository _refreshTokenRepository;
        private readonly AppDbContext _context;
        private readonly OtpService _otpService;
        private readonly EmailService _emailService;
        private readonly RoleManager<ApplicationRole> _roleManager;

        public AuthService(
          UserManager<ApplicationUser> userManager,
          JwtService jwtService,
          RefreshTokenRepository refreshTokenRepository,
          AppDbContext context,
          OtpService otpService,
          EmailService emailService,
          RoleManager<ApplicationRole> roleManager,
            IHttpContextAccessor httpContextAccessor

          )
        {
            _userManager = userManager;
            _jwtService = jwtService;
            _refreshTokenRepository = refreshTokenRepository;
            _context = context;
            _otpService = otpService;
            _emailService = emailService;
            _roleManager = roleManager;

            _httpContextAccessor = httpContextAccessor;
        }

        private string GenerateRefreshToken()
        {
            var randomBytes = RandomNumberGenerator.GetBytes(64);

            return Convert.ToBase64String(randomBytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .TrimEnd('=');
        }
        private string HashRefreshToken(string refreshToken)
        {
            var bytes = Encoding.UTF8.GetBytes(refreshToken);

            var hash = SHA256.HashData(bytes);

            return Convert.ToHexString(hash);
        }


        public async Task<LoginResponseDto> LoginAsync(
            LoginRequestDto request)
        {
            // 1. Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null)
            {
                throw new ApiException(
                    "INVALID_CREDENTIALS",
                    "Invalid email or password.",
                    401
                );
            }

            // 2. Check password
            var isPasswordCorrect = await _userManager.CheckPasswordAsync(
                user,
                request.Password
            );

            if (!isPasswordCorrect)
            {
                throw new ApiException(
                    "INVALID_CREDENTIALS",
                    "Invalid email or password.",
                    401
                );
            }

            // 3. Check account status
            if (user.AccountStatus == "suspended")
            {
                throw new ApiException(
                    "ACCOUNT_SUSPENDED",
                    "Your account is suspended.",
                    403
                );
            }

            if (user.AccountStatus == "inactive")
            {
                throw new ApiException(
                    "ACCOUNT_INACTIVE",
                    "Your account is inactive.",
                    403
                );
            }

            // 4. Check email verification
            if (!user.EmailConfirmed)
            {
                throw new ApiException(
                    "EMAIL_NOT_VERIFIED",
                    "Please verify your email first.",
                    403
                );
            }

            // 5. Get user role
            var roles = await _userManager.GetRolesAsync(user);

            var role = roles.FirstOrDefault();

            if (role == null)
            {
                throw new ApiException(
                    "USER_ROLE_NOT_FOUND",
                    "User role is not assigned.",
                    403
                );
            }

            // 6. Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user, role);

            var refreshToken = GenerateRefreshToken();

            // 7. Start database transaction
            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                // 8. Create refresh token entity
                var refreshTokenEntity = new RefreshToken
                {
                    UserId = user.Id,
                    TokenHash = HashRefreshToken(refreshToken),
                    FamilyId = Guid.NewGuid().ToString(),
                    ExpiresAt = DateTime.UtcNow.AddDays(
                     _jwtService.GetRefreshTokenExpiresInDays()
                 ),
                    CreatedAt = DateTime.UtcNow,

                    CreatedByIp = httpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = httpContext.Request.Headers.UserAgent.ToString()
                };

                // 9. Save refresh token
                await _refreshTokenRepository.AddAsync(refreshTokenEntity);

                // 10. Update last active date
                user.LastActiveAt = DateTime.UtcNow;

                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded)
                {
                    throw new ApiException(
                        "LOGIN_FAILED",
                        "Could not update user activity.",
                        500
                    );
                }

                // 11. Commit transaction
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // 12. Return login response
            return new LoginResponseDto
            {
                AccessToken = accessToken,
                ExpiresIn = _jwtService.GetAccessTokenExpiresInSeconds(),
                RefreshToken = refreshToken,

                User = new LoginUserDto
                {
                    UserId = user.Id,
                    DisplayName = user.DisplayName,
                    Role = role
                }
            };
        }



        public async Task<RegisterResponseDto> RegisterAsync(
            RegisterRequestDto request)
        {
            // 1. Check if email already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email);

            if (existingUser != null)
            {
                throw new ApiException(
                    "EMAIL_ALREADY_EXISTS",
                    "An account with this email already exists.",
                    409
                );
            }

            const string roleName = "USER_CITIZEN";

            // 2. Check if USER_CITIZEN role exists
            var roleExists = await _roleManager.RoleExistsAsync(roleName);

            if (!roleExists)
            {
                throw new ApiException(
                    "ROLE_NOT_FOUND",
                    "USER_CITIZEN role has not been configured.",
                    500
                );
            }

            // 3. Create user object
            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                DisplayName = request.DisplayName,
                EmailConfirmed = false,
                AccountStatus = "active",
                CreatedAt = DateTime.UtcNow,
                WarningCount = 0
            };

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            string otp;

            try
            {
                // 4. Create user (Identity hashes the password)
                var createResult = await _userManager.CreateAsync(
                    user,
                    request.Password
                );

                if (!createResult.Succeeded)
                {
                    if (createResult.Errors.Any(e =>
                        e.Code == "DuplicateEmail" ||
                        e.Code == "DuplicateUserName"))
                    {
                        throw new ApiException(
                            "EMAIL_ALREADY_EXISTS",
                            "An account with this email already exists.",
                            409
                        );
                    }

                    throw new ApiException(
                        "VALIDATION_ERROR",
                        "The registration data is invalid.",
                        400
                    );
                }

                // 5. Assign USER_CITIZEN role
                var roleResult = await _userManager.AddToRoleAsync(
                    user,
                    roleName
                );

                if (!roleResult.Succeeded)
                {
                    throw new ApiException(
                        "ROLE_ASSIGNMENT_FAILED",
                        "Could not assign the user role.",
                        500
                    );
                }

                // 6. Create wallet with zero balances
                var wallet = new Wallet
                {
                    UserId = user.Id,
                    AvailablePoints = 0,
                    LifetimeEarnedPoints = 0
                };

                await _context.Wallets.AddAsync(wallet);
                await _context.SaveChangesAsync();


                // 7. Generate email verification OTP
                const string purpose = "email_verification";

                otp = _otpService.GenerateOtp();

                var otpHash = _otpService.HashOtp(
                    user.Id,
                    purpose,
                    otp
                );

                var otpEntity = new AuthOtp
                {
                    UserId = user.Id,
                    Purpose = purpose,
                    OtpHash = otpHash,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                    FailedAttempts = 0
                };

                await _context.AuthOtps.AddAsync(otpEntity);

                // 8. Save wallet and OTP
                await _context.SaveChangesAsync();

                // 9. Commit transaction
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // 10. Send verification OTP by email
            await _emailService.SendVerificationOtpAsync(
                user.Email!,
                otp
            );

            // 11. Return registration response
            return new RegisterResponseDto
            {
                UserId = user.Id,
                Email = user.Email!,
                DisplayName = user.DisplayName,
                Role = roleName,
                IsVerified = user.EmailConfirmed,
                CreatedAt = user.CreatedAt
            };
        }


        public async Task<VerifyEmailResponseDto> VerifyEmailAsync(
             VerifyEmailRequestDto request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null || user.EmailConfirmed)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            var otpEntity = await _context.AuthOtps
                .Where(otp =>
                    otp.UserId == user.Id)
                .OrderByDescending(otp => otp.CreatedAt)
                .FirstOrDefaultAsync();

            if (otpEntity == null || otpEntity.ExpiresAt <= DateTime.UtcNow)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            if (otpEntity.FailedAttempts >= 5)
            {
                throw new ApiException(
                    "TOO_MANY_ATTEMPTS",
                    "Too many incorrect attempts. Request a new code.",
                    429
                );
            }

            ApiException? verificationError = null;

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                bool isValid = _otpService.VerifyOtp(
                    user.Id,
                    "email_verification",
                    request.Otp,
                    otpEntity.OtpHash
                );

                if (!isValid)
                {
                    otpEntity.FailedAttempts++;

                    if (otpEntity.FailedAttempts >= 5)
                    {
                        otpEntity.InvalidatedAt = DateTime.UtcNow;

                        verificationError = new ApiException(
                            "TOO_MANY_ATTEMPTS",
                            "Too many incorrect attempts. Request a new code.",
                            429
                        );
                    }
                    else
                    {
                        verificationError = new ApiException(
                            "INVALID_OR_EXPIRED_OTP",
                            "The code is incorrect or has expired.",
                            400
                        );
                    }

                    await _context.SaveChangesAsync();
                }
                else
                {
                    user.EmailConfirmed = true;

                    var updateResult = await _userManager.UpdateAsync(user);

                    if (!updateResult.Succeeded)
                    {
                        throw new ApiException(
                            "EMAIL_VERIFICATION_FAILED",
                            "Could not verify the email.",
                            500
                        );
                    }

                    otpEntity.ConsumedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // Throw the error only after the transaction has committed.
            if (verificationError != null)
            {
                throw verificationError;
            }

            return new VerifyEmailResponseDto
            {
                Message = "Email verified successfully. You can now log in.",
                IsVerified = true
            };
        }

        public async Task<ResendVerificationOtpResponseDto>
        ResendVerificationOtpAsync(ResendVerificationOtpRequestDto request)
        {
            const string purpose = "email_verification";

            const string successMessage =
                "If the account exists and is not verified, a new code has been sent.";

            var user = await _userManager.FindByEmailAsync(request.Email);

            // Don't reveal whether the email exists or is already verified.
            if (user == null || user.EmailConfirmed)
            {
                return new ResendVerificationOtpResponseDto
                {
                    Message = successMessage
                };
            }

            var now = DateTime.UtcNow;
            var oneHourAgo = now.AddHours(-1);

            // Count all verification OTPs sent during the last hour.
            // This includes the first OTP sent during registration.
            var sentCount = await _context.AuthOtps
                .CountAsync(otp =>
                    otp.UserId == user.Id &&
                    otp.Purpose == purpose &&
                    otp.CreatedAt >= oneHourAgo);

            if (sentCount >= 5)
            {
                throw new ApiException(
                    "TOO_MANY_REQUESTS",
                    "You have reached the maximum number of OTP requests. Try again later.",
                    429
                );
            }

            // Get the most recently created verification OTP.
            var lastOtp = await _context.AuthOtps
                .Where(otp =>
                    otp.UserId == user.Id &&
                    otp.Purpose == purpose)
                .OrderByDescending(otp => otp.CreatedAt)
                .FirstOrDefaultAsync();

            if (lastOtp != null &&
                lastOtp.CreatedAt > now.AddSeconds(-60))
            {
                throw new ApiException(
                    "TOO_MANY_REQUESTS",
                    "Please wait 60 seconds before requesting another code.",
                    429
                );
            }

            string newOtp = _otpService.GenerateOtp();

            var newOtpEntity = new AuthOtp
            {
                UserId = user.Id,
                Purpose = purpose,
                OtpHash = _otpService.HashOtp(user.Id, purpose, newOtp),
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(10),
                FailedAttempts = 0
            };

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                // Invalidate all previous active verification codes.
                var activeOtps = await _context.AuthOtps
                    .Where(otp =>
                        otp.UserId == user.Id)
                    .ToListAsync();

                foreach (var otp in activeOtps)
                {
                    otp.InvalidatedAt = now;
                }

                await _context.AuthOtps.AddAsync(newOtpEntity);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }

            // Send the email after saving the new OTP.
            await _emailService.SendVerificationOtpAsync(
                user.Email!,
                newOtp
            );

            return new ResendVerificationOtpResponseDto
            {
                Message = successMessage
            };
        }




    }
}
