using Microsoft.AspNetCore.Identity;
using SmartBin.Dtos.Auth;
using SmartBin.DTOs.Auth;
using SmartBin.Models;
using SmartBin.Repositories.Abstractions;
using SmartBin.Repositories.Auth;
using SmartBin.Repositories.Wallet;
using System.Security.Cryptography;
using System.Text;

namespace SmartBin.Services.Auth
{
    public class AuthService 
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly JwtService _jwtService;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IAuthOtpRepository _authOtpRepository;
        private readonly IWalletRepository _walletRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly OtpService _otpService;
        private readonly EmailService _emailService;
        private readonly RoleManager<ApplicationRole> _roleManager;

        public AuthService(
            UserManager<ApplicationUser> userManager,
            JwtService jwtService,
            IRefreshTokenRepository refreshTokenRepository,
            IAuthOtpRepository authOtpRepository,
            IWalletRepository walletRepository,
            IUnitOfWork unitOfWork,
            OtpService otpService,
            EmailService emailService,
            RoleManager<ApplicationRole> roleManager,
            IHttpContextAccessor httpContextAccessor)
        {
            _userManager = userManager;
            _jwtService = jwtService;
            _refreshTokenRepository = refreshTokenRepository;
            _authOtpRepository = authOtpRepository;
            _walletRepository = walletRepository;
            _unitOfWork = unitOfWork;
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

        private static void EnsureAccountActiveForAuth(ApplicationUser user)
        {
            if (string.Equals(user.AccountStatus, "suspended", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(user.AccountStatus, "banned", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    "ACCOUNT_SUSPENDED",
                    "Your account is suspended.",
                    403
                );
            }

            if (string.Equals(user.AccountStatus, "inactive", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    "ACCOUNT_INACTIVE",
                    "Your account is inactive.",
                    403
                );
            }
        }

        private async Task<string> ResolvePrimaryRoleAsync(ApplicationUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault(r => string.Equals(r, "SYS_ADMIN", StringComparison.OrdinalIgnoreCase))
                ?? roles.FirstOrDefault();

            if (role == null)
            {
                throw new ApiException(
                    "USER_ROLE_NOT_FOUND",
                    "User role is not assigned.",
                    403
                );
            }

            return role;
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
            EnsureAccountActiveForAuth(user);

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
            var role = await ResolvePrimaryRoleAsync(user);

            // 6. Generate tokens
            var accessToken = _jwtService.GenerateAccessToken(user, role);

            var refreshToken = GenerateRefreshToken();

            // 7. Start database transaction
            await _unitOfWork.BeginTransactionAsync();

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

                    CreatedByIp = httpContext?.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = httpContext?.Request.Headers.UserAgent.ToString()
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
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
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
                    Email = user.Email ?? string.Empty,
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

            await _unitOfWork.BeginTransactionAsync();

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

                await _walletRepository.AddAsync(wallet);
                await _unitOfWork.SaveChangesAsync();


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
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                    FailedAttempts = 0
                };

                await _authOtpRepository.AddAsync(otpEntity);

                // 8. Save wallet and OTP
                await _unitOfWork.SaveChangesAsync();

                // 9. Commit transaction
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
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

            var otpEntity = await _authOtpRepository.GetLatestActiveOtpAsync(user.Id, "email_verification");

            if (otpEntity == null)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            // Check if OTP has expired
            if (otpEntity.ExpiresAt <= DateTime.UtcNow)
            {
                otpEntity.InvalidatedAt = DateTime.UtcNow;
                _authOtpRepository.Update(otpEntity);

                await _unitOfWork.SaveChangesAsync();

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

            await _unitOfWork.BeginTransactionAsync();

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

                    _authOtpRepository.Update(otpEntity);
                    await _unitOfWork.SaveChangesAsync();
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
                    _authOtpRepository.Update(otpEntity);

                    await _unitOfWork.SaveChangesAsync();
                }

                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
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
            var sentCount = await _authOtpRepository.CountRecentOtpsAsync(user.Id, purpose, oneHourAgo);

            if (sentCount >= 5)
            {
                throw new ApiException(
                    "TOO_MANY_REQUESTS",
                    "You have reached the maximum number of OTP requests. Try again later.",
                    429
                );
            }

            // Get the most recently created verification OTP.
            var lastOtp = await _authOtpRepository.GetLatestOtpAsync(user.Id, purpose);

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

            await _unitOfWork.BeginTransactionAsync();

            try
            {
                // Invalidate all previous active verification codes.
                var activeOtps = await _authOtpRepository.GetActiveOtpsAsync(user.Id, purpose);

                foreach (var otp in activeOtps)
                {
                    otp.InvalidatedAt = now;
                    _authOtpRepository.Update(otp);
                }

                await _authOtpRepository.AddAsync(newOtpEntity);

                await _unitOfWork.SaveChangesAsync();
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
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

        public async Task LogoutAsync(int userId, string? refreshToken)
        {
            // لو المستخدم مبعتش Refresh Token
            // مفيش حاجة نلغيها في قاعدة البيانات
            if (string.IsNullOrWhiteSpace(refreshToken))
                return;

            // نحول الـ Refresh Token إلى Hash
            var tokenHash = HashRefreshToken(refreshToken);

            // نلغي كل التوكنز التابعة لنفس الـ Family
            await _refreshTokenRepository.RevokeFamilyAsync(
                tokenHash,
                userId
            );
        }

        public async Task<RefreshResponseDto> RefreshAsync(
            RefreshRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.RefreshToken))
            {
                throw new ApiException(
                    "VALIDATION_ERROR",
                    "Refresh token is required.",
                    400
                );
            }

            var tokenHash = HashRefreshToken(request.RefreshToken);

            var oldToken = await _refreshTokenRepository
                .GetByTokenHashAsync(tokenHash);

            if (oldToken == null)
            {
                throw new ApiException(
                    "INVALID_REFRESH_TOKEN",
                    "The refresh token is invalid, expired or already used.",
                    401
                );
            }

            // Reuse detection: revoke the whole family.
            if (oldToken.RevokedAt != null)
            {
                await _refreshTokenRepository.RevokeFamilyAsync(
                    tokenHash,
                    oldToken.UserId
                );

                throw new ApiException(
                    "INVALID_REFRESH_TOKEN",
                    "The refresh token is invalid, expired or already used.",
                    401
                );
            }

            if (oldToken.ExpiresAt <= DateTime.UtcNow)
            {
                throw new ApiException(
                    "INVALID_REFRESH_TOKEN",
                    "The refresh token is invalid, expired or already used.",
                    401
                );
            }

            var user = await _userManager.FindByIdAsync(
                oldToken.UserId.ToString()
            );

            if (user == null)
            {
                throw new ApiException(
                    "INVALID_REFRESH_TOKEN",
                    "The refresh token is invalid, expired or already used.",
                    401
                );
            }

            EnsureAccountActiveForAuth(user);

            if (!user.EmailConfirmed)
            {
                throw new ApiException(
                    "EMAIL_NOT_VERIFIED",
                    "Please verify your email first.",
                    403
                );
            }

            var role = await ResolvePrimaryRoleAsync(user);

            var now = DateTime.UtcNow;

            var newAccessToken = _jwtService.GenerateAccessToken(
                user,
                role
            );

            var newRefreshToken = GenerateRefreshToken();

            await _unitOfWork.BeginTransactionAsync();

            try
            {
                var newTokenEntity = new RefreshToken
                {
                    UserId = user.Id,
                    TokenHash = HashRefreshToken(newRefreshToken),
                    FamilyId = oldToken.FamilyId,
                    CreatedAt = now,
                    ExpiresAt = now.AddDays(
                        _jwtService.GetRefreshTokenExpiresInDays()
                    ),
                    CreatedByIp = _httpContextAccessor.HttpContext?
                        .Connection.RemoteIpAddress?.ToString(),
                    UserAgent = _httpContextAccessor.HttpContext?
                        .Request.Headers.UserAgent.ToString()
                };

                // Save new token first to get its database ID.
                await _refreshTokenRepository.AddAsync(newTokenEntity);

                // Revoke old token and link it to the replacement.
                oldToken.RevokedAt = now;
                oldToken.ReplacedByTokenId = newTokenEntity.RefreshTokenId;

                await _refreshTokenRepository.UpdateAsync(oldToken);

                user.LastActiveAt = now;

                var updateResult = await _userManager.UpdateAsync(user);

                if (!updateResult.Succeeded)
                {
                    throw new ApiException(
                        "REFRESH_FAILED",
                        "Could not update user activity.",
                        500
                    );
                }

                await _unitOfWork.CommitTransactionAsync();

                return new RefreshResponseDto
                {
                    AccessToken = newAccessToken,
                    ExpiresIn = _jwtService.GetAccessTokenExpiresInSeconds(),
                    RefreshToken = newRefreshToken
                };
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }
        }


        public async Task<ForgotPasswordResponseDto> ForgotPasswordAsync(
            ForgotPasswordRequestDto request)
        {
            const string purpose = "password_reset";

            const string successMessage =
                "If this email exists, a verification code has been sent.";

            // 1. Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);

            // 2. Don't reveal whether the email exists
            if (user == null ||
                !user.EmailConfirmed ||
                !string.Equals(user.AccountStatus, "active", StringComparison.OrdinalIgnoreCase))
            {
                return new ForgotPasswordResponseDto
                {
                    Message = successMessage
                };
            }

            var now = DateTime.UtcNow;
            var oneHourAgo = now.AddHours(-1);

            // 3. Count password reset OTPs sent during the last hour
            var sentCount = await _authOtpRepository.CountRecentOtpsAsync(user.Id, purpose, oneHourAgo);

            if (sentCount >= 5)
            {
                throw new ApiException(
                    "TOO_MANY_REQUESTS",
                    "You have reached the maximum number of OTP requests. Try again later.",
                    429
                );
            }

            // 4. Get the latest password reset OTP
            var lastOtp = await _authOtpRepository.GetLatestOtpAsync(user.Id, purpose);

            // 5. Enforce 60-second resend cooldown
            if (lastOtp != null &&
                lastOtp.CreatedAt > now.AddSeconds(-60))
            {
                throw new ApiException(
                    "TOO_MANY_REQUESTS",
                    "Please wait 60 seconds before requesting another code.",
                    429
                );
            }

            // 6. Generate a new OTP
            string otpCode = _otpService.GenerateOtp();

            string otpHash = _otpService.HashOtp(
                user.Id,
                purpose,
                otpCode
            );

            var otpEntity = new AuthOtp
            {
                UserId = user.Id,
                Purpose = purpose,
                OtpHash = otpHash,
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(10),
                FailedAttempts = 0
            };

            await _unitOfWork.BeginTransactionAsync();

            try
            {
                // 7. Invalidate previous active password reset OTPs
                var activeOtps = await _authOtpRepository.GetActiveOtpsAsync(user.Id, purpose);

                foreach (var oldOtp in activeOtps)
                {
                    oldOtp.InvalidatedAt = now;
                    _authOtpRepository.Update(oldOtp);
                }

                // 8. Save the new OTP
                await _authOtpRepository.AddAsync(otpEntity);

                await _unitOfWork.SaveChangesAsync();

                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }

            // 9. Send OTP by email
            await _emailService.SendPasswordResetOtpAsync(
                user.Email!,
                otpCode
            );

            // 10. Return the same generic response
            return new ForgotPasswordResponseDto
            {
                Message = successMessage
            };
        }


        public async Task<bool> VerifyResetOtpAsync(
            VerifyResetOtpRequestDto request)
        {
            const string purpose = "password_reset";

            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Otp) ||
                request.Otp.Length != 5 ||
                !request.Otp.All(char.IsDigit))
            {
                throw new ApiException(
                    "VALIDATION_ERROR",
                    "Email and a valid 5-digit OTP are required.",
                    400
                );
            }

            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            var otpEntity = await _authOtpRepository.GetLatestOtpAsync(user.Id, purpose);

            if (otpEntity == null ||
                otpEntity.ConsumedAt != null ||
                otpEntity.InvalidatedAt != null)
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

            var now = DateTime.UtcNow;

            if (otpEntity.ExpiresAt <= now)
            {
                otpEntity.InvalidatedAt = now;
                _authOtpRepository.Update(otpEntity);
                await _unitOfWork.SaveChangesAsync();

                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            bool isValid = _otpService.VerifyOtp(
                user.Id,
                purpose,
                request.Otp,
                otpEntity.OtpHash
            );

            if (!isValid)
            {
                otpEntity.FailedAttempts++;

                if (otpEntity.FailedAttempts >= 5)
                {
                    otpEntity.InvalidatedAt = now;
                }

                _authOtpRepository.Update(otpEntity);
                await _unitOfWork.SaveChangesAsync();

                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            return true;
        }

        public async Task<ResetPasswordResponseDto> ResetPasswordAsync(
            ResetPasswordRequestDto request)
        {
            const string purpose = "password_reset";

            // 1. Validate required inputs
            if (string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Otp) ||
                string.IsNullOrWhiteSpace(request.NewPassword) ||
                request.Otp.Length != 5 ||
                !request.Otp.All(char.IsDigit))
            {
                throw new ApiException(
                    "VALIDATION_ERROR",
                    "Email, a valid 5-digit OTP and new password are required.",
                    400
                );
            }

            // 2. Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            // 3. Get the latest password reset OTP
            var otpEntity = await _authOtpRepository.GetLatestOtpAsync(user.Id, purpose);

            if (otpEntity == null)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            // 4. Check maximum failed attempts
            if (otpEntity.FailedAttempts >= 5)
            {
                throw new ApiException(
                    "TOO_MANY_ATTEMPTS",
                    "Too many incorrect attempts. Request a new code.",
                    429
                );
            }

            // 5. Check whether OTP was already used or invalidated
            if (otpEntity.ConsumedAt != null ||
                otpEntity.InvalidatedAt != null)
            {
                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            // 6. Check OTP expiration
            var now = DateTime.UtcNow;

            if (otpEntity.ExpiresAt <= now)
            {
                otpEntity.InvalidatedAt = now;
                _authOtpRepository.Update(otpEntity);

                await _unitOfWork.SaveChangesAsync();

                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            // 7. Verify the entered OTP
            bool isValid = _otpService.VerifyOtp(
                user.Id,
                purpose,
                request.Otp,
                otpEntity.OtpHash
            );

            if (!isValid)
            {
                otpEntity.FailedAttempts++;

                if (otpEntity.FailedAttempts >= 5)
                {
                    otpEntity.InvalidatedAt = now;

                    _authOtpRepository.Update(otpEntity);
                    await _unitOfWork.SaveChangesAsync();

                    throw new ApiException(
                        "TOO_MANY_ATTEMPTS",
                        "Too many incorrect attempts. Request a new code.",
                        429
                    );
                }

                _authOtpRepository.Update(otpEntity);
                await _unitOfWork.SaveChangesAsync();

                throw new ApiException(
                    "INVALID_OR_EXPIRED_OTP",
                    "The code is incorrect or has expired.",
                    400
                );
            }

            // 8. Start transaction
            await _unitOfWork.BeginTransactionAsync();

            try
            {
                // 9. Generate Identity password reset token
                var resetToken =
                    await _userManager.GeneratePasswordResetTokenAsync(user);

                // 10. Change password using ASP.NET Core Identity
                var resetResult = await _userManager.ResetPasswordAsync(
                    user,
                    resetToken,
                    request.NewPassword
                );

                if (!resetResult.Succeeded)
                {
                    throw new ApiException(
                        "VALIDATION_ERROR",
                        "The new password does not meet the password requirements.",
                        400
                    );
                }

                // 11. Mark the OTP as consumed
                otpEntity.ConsumedAt = now;
                _authOtpRepository.Update(otpEntity);

                // 12. Invalidate other active password reset OTPs
                await _authOtpRepository.InvalidateOtherActiveOtpsAsync(user.Id, purpose, otpEntity.OtpId, now);

                // 13. Revoke all refresh tokens for this user
                await _refreshTokenRepository.RevokeAllUserTokensAsync(
                    user.Id
                );

                await _unitOfWork.SaveChangesAsync();

                // 14. Commit transaction
                await _unitOfWork.CommitTransactionAsync();
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync();
                throw;
            }

            // 15. Return success response
            return new ResetPasswordResponseDto
            {
                Message =
                    "Password has been reset successfully. Please log in again."
            };
        }
    }
}
