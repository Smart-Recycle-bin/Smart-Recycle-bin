using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Collectors;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Auth;
using SmartBin.Repositories.Collectors;
using SmartBin.Services.Audit;
using SmartBin.Services.Auth;

namespace SmartBin.Services.Collectors
{
    public class AdminCollectorService : IAdminCollectorService
    {
        private const string CollectorRole = "OPS_COLLECTOR";
        private const string ModeInviteLink = "invite_link";
        private const string ModeTemporaryPassword = "temporary_password";
        private const string SetupOtpPurpose = "password_reset";

        private static readonly Regex PhoneCharsRegex = new(@"^\+?[0-9\s\-().]+$", RegexOptions.Compiled);
        private static readonly Regex StrongTempPasswordRegex = new(@"^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,}$", RegexOptions.Compiled);

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active",
            "inactive"
        };

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "name",
            "email",
            "phone",
            "district",
            "assignedBinsCount",
            "status",
            "lastActiveAt",
            "createdAt"
        };

        private readonly IAdminCollectorRepository _adminCollectorRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<ApplicationRole> _roleManager;
        private readonly IAuthOtpRepository _authOtpRepository;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly OtpService _otpService;
        private readonly EmailService _emailService;
        private readonly IAuditLogService _auditLogService;
        private readonly IUnitOfWork _unitOfWork;
        private readonly ILogger<AdminCollectorService> _logger;

        public AdminCollectorService(
            IAdminCollectorRepository adminCollectorRepository,
            UserManager<ApplicationUser> userManager,
            RoleManager<ApplicationRole> roleManager,
            IAuthOtpRepository authOtpRepository,
            IRefreshTokenRepository refreshTokenRepository,
            OtpService otpService,
            EmailService emailService,
            IAuditLogService auditLogService,
            IUnitOfWork unitOfWork,
            ILogger<AdminCollectorService> logger)
        {
            _adminCollectorRepository = adminCollectorRepository;
            _userManager = userManager;
            _roleManager = roleManager;
            _authOtpRepository = authOtpRepository;
            _refreshTokenRepository = refreshTokenRepository;
            _otpService = otpService;
            _emailService = emailService;
            _auditLogService = auditLogService;
            _unitOfWork = unitOfWork;
            _logger = logger;
        }

        public async Task<(List<AdminCollectorDto> Items, PaginationMetaDto Meta)> GetCollectorsAsync(
            string? search,
            string? district,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            ValidatePagination(page, pageSize);

            string? normalizedStatus = null;
            if (!string.IsNullOrWhiteSpace(status))
            {
                normalizedStatus = status.Trim().ToLowerInvariant();
                if (!AllowedStatuses.Contains(normalizedStatus))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid status filter.",
                        new[] { new { field = "status", message = "Must be active or inactive." } });
                }
            }

            string? normalizedSortBy = null;
            if (!string.IsNullOrWhiteSpace(sortBy))
            {
                normalizedSortBy = sortBy.Trim();
                if (!AllowedSortFields.Contains(normalizedSortBy))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Invalid sortBy value.",
                        new[]
                        {
                            new
                            {
                                field = "sortBy",
                                message = "Must be one of name, email, phone, district, assignedBinsCount, status, lastActiveAt, createdAt."
                            }
                        });
                }
            }

            var normalizedSortDir = string.IsNullOrWhiteSpace(sortDir) ? "asc" : sortDir.Trim().ToLowerInvariant();
            if (normalizedSortDir != "asc" && normalizedSortDir != "desc")
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid sortDir value.",
                    new[] { new { field = "sortDir", message = "Must be asc or desc." } });
            }

            var (items, totalItems) = await _adminCollectorRepository.GetCollectorsPagedAsync(
                search,
                district,
                normalizedStatus,
                page,
                pageSize,
                normalizedSortBy,
                normalizedSortDir,
                cancellationToken);

            foreach (var item in items)
            {
                item.LastActiveAt = EnsureUtc(item.LastActiveAt);
            }

            return (items, BuildPaginationMeta(page, pageSize, totalItems));
        }

        public async Task<CreateCollectorResponseDto> CreateCollectorAsync(
            int actorAdminId,
            CreateCollectorRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var email = request.Email?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(email))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Email is required.",
                    new[] { new { field = "email", message = "Email is required." } });
            }

            var displayName = request.DisplayName?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(displayName))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Full name is required.",
                    new[] { new { field = "displayName", message = "Full name is required." } });
            }

            var phoneNumber = ValidatePhoneNumber(request.PhoneNumber);
            var district = string.IsNullOrWhiteSpace(request.District) ? null : request.District.Trim();

            var credentialsMode = string.IsNullOrWhiteSpace(request.CredentialsMode)
                ? ModeInviteLink
                : request.CredentialsMode.Trim().ToLowerInvariant();

            if (credentialsMode != ModeInviteLink && credentialsMode != ModeTemporaryPassword)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid credentialsMode value.",
                    new[] { new { field = "credentialsMode", message = "Must be invite_link or temporary_password." } });
            }

            string? temporaryPassword = null;
            if (credentialsMode == ModeTemporaryPassword)
            {
                temporaryPassword = request.TemporaryPassword?.Trim();
                if (string.IsNullOrWhiteSpace(temporaryPassword))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Temporary password is required.",
                        new[] { new { field = "temporaryPassword", message = "Temporary password is required." } });
                }

                if (!StrongTempPasswordRegex.IsMatch(temporaryPassword))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Temporary password does not meet policy requirements.",
                        new[]
                        {
                            new
                            {
                                field = "temporaryPassword",
                                message = "Password must be at least 8 characters with at least one letter, one digit, and no whitespace."
                            }
                        });
                }
            }
            else if (!string.IsNullOrWhiteSpace(request.TemporaryPassword))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Temporary password cannot be provided when credentialsMode is invite_link.",
                    new[]
                    {
                        new
                        {
                            field = "temporaryPassword",
                            message = "Omit temporaryPassword when credentialsMode is invite_link."
                        }
                    });
            }

            if (!await _roleManager.RoleExistsAsync(CollectorRole))
            {
                throw new ApiException(
                    StatusCodes.Status500InternalServerError,
                    "ROLE_NOT_FOUND",
                    "OPS_COLLECTOR role has not been configured.");
            }

            var existingUser = await _userManager.FindByEmailAsync(email);
            if (existingUser != null)
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "EMAIL_ALREADY_EXISTS",
                    "An account with this email already exists.",
                    new[] { new { field = "email", message = "An account with this email already exists." } });
            }

            var now = DateTime.UtcNow;
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                DisplayName = displayName,
                PhoneNumber = phoneNumber,
                District = district,
                AccountStatus = "active",
                EmailConfirmed = true,
                CreatedAt = now,
                LastActiveAt = now
            };

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                var createResult = credentialsMode == ModeTemporaryPassword
                    ? await _userManager.CreateAsync(user, temporaryPassword!)
                    : await _userManager.CreateAsync(user);

                if (!createResult.Succeeded)
                {
                    ThrowMappedIdentityValidationError(createResult.Errors, "temporaryPassword");
                }

                var roleResult = await _userManager.AddToRoleAsync(user, CollectorRole);
                if (!roleResult.Succeeded)
                {
                    throw new ApiException(
                        StatusCodes.Status500InternalServerError,
                        "INTERNAL_ERROR",
                        "Failed to assign OPS_COLLECTOR role.");
                }

                var auditSummary = district != null
                    ? $"Collector provisioned (district: {district}, mode: {credentialsMode})."
                    : $"Collector provisioned (mode: {credentialsMode}).";

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.CollectorProvisioning,
                    AuditResourceTypes.Collector,
                    user.Id.ToString(CultureInfo.InvariantCulture),
                    auditSummary,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            var inviteEmailSent = false;
            if (credentialsMode == ModeInviteLink && _emailService.IsConfigured() && _otpService.IsConfigured())
            {
                inviteEmailSent = await TrySendOnboardingOtpAsync(user, cancellationToken);
            }
            else if (credentialsMode == ModeInviteLink)
            {
                _logger.LogInformation(
                    "Collector account {CollectorId} provisioned in invite_link mode by admin {AdminId} without SMTP/OTP configuration; onboarding email was not sent.",
                    user.Id,
                    actorAdminId);
            }

            return new CreateCollectorResponseDto
            {
                CollectorId = user.Id,
                UserId = user.Id,
                Email = user.Email ?? email,
                DisplayName = user.DisplayName,
                Role = CollectorRole,
                District = user.District,
                Status = user.AccountStatus,
                CredentialsMode = credentialsMode,
                InviteEmailSent = inviteEmailSent,
                CreatedAt = now
            };
        }

        public async Task<AdminCollectorDto> UpdateCollectorAsync(
            int collectorId,
            int actorAdminId,
            UpdateCollectorRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (collectorId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "collectorId must be a positive integer.",
                    new[] { new { field = "collectorId", message = "collectorId must be a positive integer." } });
            }

            var user = await LoadEligibleCollectorAsync(collectorId);

            string? trimmedDisplayName = null;
            if (request.DisplayName != null)
            {
                trimmedDisplayName = request.DisplayName.Trim();
                if (string.IsNullOrWhiteSpace(trimmedDisplayName))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Full name cannot be empty.",
                        new[] { new { field = "displayName", message = "Full name is required." } });
                }
            }

            string? trimmedEmail = null;
            bool emailChanged = false;
            if (request.Email != null)
            {
                trimmedEmail = request.Email.Trim();
                if (string.IsNullOrWhiteSpace(trimmedEmail))
                {
                    throw new ApiException(
                        StatusCodes.Status400BadRequest,
                        "VALIDATION_ERROR",
                        "Email cannot be empty.",
                        new[] { new { field = "email", message = "Email is required." } });
                }

                emailChanged = !string.Equals(trimmedEmail, user.Email, StringComparison.OrdinalIgnoreCase);
                if (emailChanged)
                {
                    var existingByEmail = await _userManager.FindByEmailAsync(trimmedEmail);
                    if (existingByEmail != null && existingByEmail.Id != user.Id)
                    {
                        throw new ApiException(
                            StatusCodes.Status409Conflict,
                            "EMAIL_ALREADY_EXISTS",
                            "An account with this email already exists.",
                            new[] { new { field = "email", message = "An account with this email already exists." } });
                    }
                }
            }

            string? validatedPhone = null;
            if (request.PhoneNumber != null)
            {
                validatedPhone = ValidatePhoneNumber(request.PhoneNumber);
            }

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                if (emailChanged && trimmedEmail != null)
                {
                    var wasEmailConfirmed = user.EmailConfirmed;

                    var emailResult = await _userManager.SetEmailAsync(user, trimmedEmail);
                    if (!emailResult.Succeeded)
                    {
                        ThrowMappedIdentityValidationError(emailResult.Errors, "email");
                    }

                    var userNameResult = await _userManager.SetUserNameAsync(user, trimmedEmail);
                    if (!userNameResult.Succeeded)
                    {
                        ThrowMappedIdentityValidationError(userNameResult.Errors, "email");
                    }

                    // Preserve admin-verified confirmation state after SetEmailAsync resets it
                    user.EmailConfirmed = wasEmailConfirmed;
                }

                var changedFields = new List<string>();
                if (emailChanged)
                {
                    changedFields.Add("email");
                }

                if (trimmedDisplayName != null)
                {
                    user.DisplayName = trimmedDisplayName;
                    changedFields.Add("displayName");
                }

                if (validatedPhone != null)
                {
                    user.PhoneNumber = validatedPhone;
                    changedFields.Add("phoneNumber");
                }

                if (request.District != null)
                {
                    user.District = string.IsNullOrWhiteSpace(request.District)
                        ? null
                        : request.District.Trim();
                    changedFields.Add("district");
                }

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    ThrowMappedIdentityValidationError(updateResult.Errors, "displayName");
                }

                var updateSummary = changedFields.Count > 0
                    ? $"Updated collector fields ({string.Join(", ", changedFields)})."
                    : "Collector account update submitted.";

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.CollectorUpdate,
                    AuditResourceTypes.Collector,
                    user.Id.ToString(CultureInfo.InvariantCulture),
                    updateSummary,
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            var assignedBinsCount = await _adminCollectorRepository.CountAssignedBinsAsync(user.Id, cancellationToken);

            return new AdminCollectorDto
            {
                CollectorId = user.Id,
                Name = user.DisplayName,
                Email = user.Email ?? string.Empty,
                Phone = user.PhoneNumber ?? string.Empty,
                District = user.District ?? string.Empty,
                AssignedBinsCount = assignedBinsCount,
                Status = user.AccountStatus,
                LastActiveAt = EnsureUtc(user.LastActiveAt)
            };
        }

        public async Task<(List<AdminAssignedBinDto> Items, PaginationMetaDto Meta)> GetAssignedBinsAsync(
            int collectorId,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            if (collectorId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "collectorId must be a positive integer.",
                    new[] { new { field = "collectorId", message = "collectorId must be a positive integer." } });
            }

            ValidatePagination(page, pageSize);

            await LoadEligibleCollectorAsync(collectorId);

            var (items, totalItems) = await _adminCollectorRepository.GetAssignedBinsPagedAsync(
                collectorId,
                page,
                pageSize,
                cancellationToken);

            foreach (var item in items)
            {
                if (item.LastServicedAt.HasValue)
                {
                    item.LastServicedAt = EnsureUtc(item.LastServicedAt.Value);
                }
            }

            return (items, BuildPaginationMeta(page, pageSize, totalItems));
        }

        public async Task<DeactivateCollectorResponseDto> DeactivateCollectorAsync(
            int collectorId,
            int actorAdminId,
            CancellationToken cancellationToken = default)
        {
            if (collectorId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "collectorId must be a positive integer.",
                    new[] { new { field = "collectorId", message = "collectorId must be a positive integer." } });
            }

            var user = await LoadEligibleCollectorAsync(collectorId);

            if (string.Equals(user.AccountStatus, "inactive", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "Collector is already inactive.");
            }

            if (!string.Equals(user.AccountStatus, "active", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    $"Collector account with status '{user.AccountStatus}' cannot be deactivated.");
            }

            var now = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                user.AccountStatus = "inactive";
                user.DeactivatedAt = now;
                user.DeactivatedByAdminId = actorAdminId;

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    throw new ApiException(
                        StatusCodes.Status500InternalServerError,
                        "INTERNAL_ERROR",
                        "Failed to deactivate collector account.");
                }

                await _refreshTokenRepository.RevokeAllUserTokensAsync(user.Id, cancellationToken);
                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.CollectorDeactivation,
                    AuditResourceTypes.Collector,
                    user.Id.ToString(CultureInfo.InvariantCulture),
                    $"Collector account deactivated ({user.DisplayName}).",
                    cancellationToken);
                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new DeactivateCollectorResponseDto
            {
                CollectorId = user.Id,
                Status = "inactive",
                DeactivatedAt = now
            };
        }

        private async Task<ApplicationUser> LoadEligibleCollectorAsync(int collectorId)
        {
            var user = await _userManager.FindByIdAsync(collectorId.ToString());
            if (user == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "Collector not found.");
            }

            if (!await _userManager.IsInRoleAsync(user, CollectorRole))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Target account does not have the OPS_COLLECTOR role.",
                    new[]
                    {
                        new
                        {
                            field = "collectorId",
                            message = "Target account does not have the OPS_COLLECTOR role."
                        }
                    });
            }

            return user;
        }

        private async Task<bool> TrySendOnboardingOtpAsync(ApplicationUser user, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var otpCode = _otpService.GenerateOtp();
            var otpEntity = new AuthOtp
            {
                UserId = user.Id,
                Purpose = SetupOtpPurpose,
                OtpHash = _otpService.HashOtp(user.Id, SetupOtpPurpose, otpCode),
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(10),
                FailedAttempts = 0
            };

            try
            {
                await _authOtpRepository.AddAsync(otpEntity);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                await _emailService.SendCollectorSetupOtpAsync(user.Email!, user.DisplayName, otpCode);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not deliver onboarding setup email for collector {CollectorId}.", user.Id);
                try
                {
                    if (otpEntity.OtpId > 0)
                    {
                        otpEntity.InvalidatedAt = DateTime.UtcNow;
                        _authOtpRepository.Update(otpEntity);
                        await _unitOfWork.SaveChangesAsync(cancellationToken);
                    }
                }
                catch
                {
                    // Best-effort cleanup of failed delivery OTP
                }
                return false;
            }
        }

        private static string ValidatePhoneNumber(string? rawPhone)
        {
            var phone = rawPhone?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(phone))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Phone number is required.",
                    new[] { new { field = "phoneNumber", message = "Phone number is required." } });
            }

            var digitsCount = phone.Count(char.IsDigit);
            if (!PhoneCharsRegex.IsMatch(phone) || digitsCount < 7 || digitsCount > 15)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid phone number format.",
                    new[] { new { field = "phoneNumber", message = "Enter a valid phone number (7-15 digits)." } });
            }

            return phone;
        }

        private static void ValidatePagination(int page, int pageSize)
        {
            if (page < 1)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "page", message = "page must be greater than or equal to 1." } });
            }

            if (pageSize < 1 || pageSize > 100)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid pagination values.",
                    new[] { new { field = "pageSize", message = "pageSize must be between 1 and 100." } });
            }
        }

        private static void ThrowMappedIdentityValidationError(IEnumerable<IdentityError> errors, string defaultField)
        {
            var errorList = errors.ToList();
            if (errorList.Any(e =>
                    string.Equals(e.Code, "DuplicateEmail", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(e.Code, "DuplicateUserName", StringComparison.OrdinalIgnoreCase)))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "EMAIL_ALREADY_EXISTS",
                    "An account with this email already exists.",
                    new[] { new { field = "email", message = "An account with this email already exists." } });
            }

            var details = errorList
                .Select(e => new
                {
                    field = e.Code.Contains("Password", StringComparison.OrdinalIgnoreCase)
                        ? "temporaryPassword"
                        : e.Code.Contains("Email", StringComparison.OrdinalIgnoreCase)
                            ? "email"
                            : defaultField,
                    message = e.Description
                })
                .ToArray();

            var message = errorList.FirstOrDefault()?.Description ?? "Invalid collector details.";
            throw new ApiException(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", message, details);
        }

        private static PaginationMetaDto BuildPaginationMeta(int page, int pageSize, int totalItems)
        {
            return new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            };
        }

        private static DateTime EnsureUtc(DateTime value)
        {
            return value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };
        }
    }
}
