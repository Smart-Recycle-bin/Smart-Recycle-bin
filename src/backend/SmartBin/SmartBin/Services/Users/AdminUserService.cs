using System.Globalization;
using Microsoft.AspNetCore.Identity;
using SmartBin.Dtos.Common;
using SmartBin.DTOs.Users;
using SmartBin.Models;
using SmartBin.Models.Constants;
using SmartBin.Repositories;
using SmartBin.Repositories.Auth;
using SmartBin.Repositories.Users;
using SmartBin.Services.Audit;

namespace SmartBin.Services.Users
{
    public class AdminUserService : IAdminUserService
    {
        private const string CitizenRole = "USER_CITIZEN";

        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active",
            "suspended",
            "banned",
            "inactive"
        };

        private static readonly HashSet<string> AllowedSortFields = new(StringComparer.OrdinalIgnoreCase)
        {
            "joinedAt",
            "name",
            "email",
            "availablePoints",
            "lifetimePoints",
            "totalSessions",
            "status"
        };

        private readonly IAdminUserRepository _adminUserRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly IAuditLogService _auditLogService;
        private readonly IUnitOfWork _unitOfWork;

        public AdminUserService(
            IAdminUserRepository adminUserRepository,
            UserManager<ApplicationUser> userManager,
            IRefreshTokenRepository refreshTokenRepository,
            IAuditLogService auditLogService,
            IUnitOfWork unitOfWork)
        {
            _adminUserRepository = adminUserRepository;
            _userManager = userManager;
            _refreshTokenRepository = refreshTokenRepository;
            _auditLogService = auditLogService;
            _unitOfWork = unitOfWork;
        }

        public async Task<(List<AdminRecyclerDto> Items, PaginationMetaDto Meta)> GetRecyclersAsync(
            string? role,
            string? search,
            string? status,
            int page,
            int pageSize,
            string? sortBy,
            string? sortDir,
            CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrWhiteSpace(role) &&
                !string.Equals(role.Trim(), CitizenRole, StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Invalid role filter.",
                    new[] { new { field = "role", message = "Role must be USER_CITIZEN." } });
            }

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
                        new[] { new { field = "status", message = "Must be active, suspended, banned, or inactive." } });
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
                        new[] { new { field = "sortBy", message = "Must be one of joinedAt, name, email, availablePoints, lifetimePoints, totalSessions, status." } });
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

            var (items, totalItems) = await _adminUserRepository.GetRecyclersPagedAsync(
                search,
                normalizedStatus,
                page,
                pageSize,
                normalizedSortBy,
                normalizedSortDir,
                cancellationToken);

            foreach (var item in items)
            {
                item.JoinedAt = EnsureUtc(item.JoinedAt);
            }

            var meta = new PaginationMetaDto
            {
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return (items, meta);
        }

        public async Task<SuspendUserResponseDto> SuspendRecyclerAsync(
            int userId,
            int actorAdminId,
            SuspendUserRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "userId must be a positive integer.",
                    new[] { new { field = "userId", message = "userId must be a positive integer." } });
            }

            var reason = request.Reason?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(reason))
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "Reason for suspension is required.",
                    new[] { new { field = "reason", message = "Reason for suspension is required." } });
            }

            var user = await LoadEligibleCitizenAsync(userId, "suspend");

            if (string.Equals(user.AccountStatus, "suspended", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "User is already suspended.");
            }

            if (!string.Equals(user.AccountStatus, "active", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    $"User account with status '{user.AccountStatus}' cannot be suspended.");
            }

            var now = DateTime.UtcNow;

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                user.AccountStatus = "suspended";
                user.SuspendedAt = now;
                user.SuspensionReason = reason;
                user.SuspendedByAdminId = actorAdminId;

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    throw new ApiException(
                        StatusCodes.Status500InternalServerError,
                        "INTERNAL_ERROR",
                        "Failed to update recycler account status.");
                }

                await _refreshTokenRepository.RevokeAllUserTokensAsync(user.Id, cancellationToken);
                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.UserSuspension,
                    AuditResourceTypes.User,
                    user.Id.ToString(CultureInfo.InvariantCulture),
                    reason,
                    cancellationToken);
                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new SuspendUserResponseDto
            {
                UserId = user.Id,
                Status = "suspended",
                Reason = reason,
                SuspendedAt = now
            };
        }

        public async Task<UnsuspendUserResponseDto> UnsuspendRecyclerAsync(
            int userId,
            int actorAdminId,
            UnsuspendUserRequestDto? request,
            CancellationToken cancellationToken = default)
        {
            if (userId <= 0)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    "userId must be a positive integer.",
                    new[] { new { field = "userId", message = "userId must be a positive integer." } });
            }

            var user = await LoadEligibleCitizenAsync(userId, "unsuspend");

            if (!string.Equals(user.AccountStatus, "suspended", StringComparison.OrdinalIgnoreCase))
            {
                throw new ApiException(
                    StatusCodes.Status409Conflict,
                    "CONFLICT",
                    "User is not currently suspended.");
            }

            var now = DateTime.UtcNow;
            var reason = string.IsNullOrWhiteSpace(request?.Reason) ? null : request.Reason.Trim();

            await _unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                user.AccountStatus = "active";
                user.UnsuspendedAt = now;
                user.UnsuspensionReason = reason;
                user.UnsuspendedByAdminId = actorAdminId;

                var updateResult = await _userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    throw new ApiException(
                        StatusCodes.Status500InternalServerError,
                        "INTERNAL_ERROR",
                        "Failed to restore recycler account status.");
                }

                await _auditLogService.RecordAsync(
                    actorAdminId,
                    AuditActionTypes.UserUnsuspension,
                    AuditResourceTypes.User,
                    user.Id.ToString(CultureInfo.InvariantCulture),
                    reason ?? "Recycler account unsuspended.",
                    cancellationToken);

                await _unitOfWork.CommitTransactionAsync(cancellationToken);
            }
            catch
            {
                await _unitOfWork.RollbackTransactionAsync(cancellationToken);
                throw;
            }

            return new UnsuspendUserResponseDto
            {
                UserId = user.Id,
                Status = "active",
                Reason = reason,
                UnsuspendedAt = now
            };
        }

        private async Task<ApplicationUser> LoadEligibleCitizenAsync(int userId, string action)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                throw new ApiException(
                    StatusCodes.Status404NotFound,
                    "NOT_FOUND",
                    "User not found.");
            }

            var roles = await _userManager.GetRolesAsync(user);
            bool isCitizen = roles.Any(r => string.Equals(r, CitizenRole, StringComparison.OrdinalIgnoreCase));
            if (!isCitizen)
            {
                throw new ApiException(
                    StatusCodes.Status400BadRequest,
                    "VALIDATION_ERROR",
                    $"Only citizen recycler accounts can be {action}ed via this endpoint.",
                    new[]
                    {
                        new
                        {
                            field = "userId",
                            message = $"Only citizen recycler accounts can be {action}ed via this endpoint."
                        }
                    });
            }

            return user;
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
