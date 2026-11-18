# EcoBin Web Admin Architecture Reference

## 5. Mock Backend Architecture & Interceptor Pipeline (Prompt 4)

### 5.1 Interceptor Execution Chain
Interceptors are registered in `src/app/app.config.ts` in strictly deterministic order:
1. `errorInterceptor` (Outermost):
   - Catches all raw `HttpErrorResponse` errors and normalizes them into strongly-typed `ApiError` instances.
   - HTTP 401: Clears authentication state via `AuthService.clearSession()`, redirects to `/login?returnUrl=<currentUrl>`, and presents a deduplicated error toast (`Session expired. Please sign in again.`). Excludes login/logout endpoints.
   - HTTP 403: Displays a permission toast (`You don't have permission to perform this action.`) without clearing the session. Excludes login form account-suspended errors.
   - HTTP 0: Displays network failure toast (`Network error. Please check your internet connection.`).
   - HTTP 5xx: Displays server error toast (`A server error occurred. Please try again later.`).
   - Business Domain Errors (`VALIDATION_ERROR`, `INSUFFICIENT_BALANCE`, `NOT_FOUND`, etc.): Suppresses global toasts to permit calling forms and views to render contextual alerts.
   - `SKIP_ERROR_HANDLING` Context Token: When present on `HttpContext`, bypasses all toasts and redirects.
   - Deduplication: Identical toast messages within 1,500ms are suppressed.
2. `authInterceptor` (Middle):
   - Injects `Authorization: Bearer <accessToken>` on requests targeting `environment.apiBaseUrl`, excluding public auth endpoints (`/auth/login`, `/auth/refresh`, `/auth/forgot-password`) and requests with `SKIP_AUTH`.
   - Single-Flight Refresh Coalescing: On raw HTTP 401 from protected API requests when a refresh token exists, triggers token refresh via `performRefresh(authService)` using a shared `shareReplay` stream so that concurrent 401s result in exactly ONE refresh request.
   - Request Retry: On refresh success, retries the original request once with the new access token and marks it with the `RETRIED` context token.
   - Failure Handling: On refresh failure, re-throws the original 401 unchanged for `errorInterceptor` to handle.
3. `mockBackendInterceptor` (Terminal / Innermost):
   - Active only when `environment.useMockBackend` is `true`.
   - Simulates realistic asynchronous latency using `timer(environment.mockLatencyMs)`.
   - Terminal: Intercepts all requests targeting `environment.apiBaseUrl` and never delegates to `next(req)`.
   - Evaluates HTTP method and path patterns via `MockRouter`.
   - Emits standard `HttpResponse<ApiResponse<T>>` or throws `HttpErrorResponse` matching the `ApiErrorBody` schema.

### 5.2 Mock Authentication Engine (`mock-auth.ts`)
- **Token Structure:** Structured tokens formatted as `mock_jwt.<base64url(payload)>.<signature>`.
- **Payload:** `{ userId: string; role: string; displayName: string; exp: number }`.
- **TTL Enforcement:** Validates `Date.now() < exp * 1000`. Expired tokens yield `401 UNAUTHORIZED`.
- **Role Verification:** Requests to `/api/v1/admin/*` require `role === 'SYS_ADMIN'`. Any non-admin role yields `403 FORBIDDEN`.
- **Refresh Token Lifecycle & Family Revocation:**
  - Tracked in `mockDb.refreshTokens`: `{ token, userId, familyId, expiresAt, usedAt, revokedAt }`.
  - **Single-Use Rotation:** When exchanged via `POST /api/v1/auth/refresh`, the consumed token is stamped with `usedAt = now`. A new token is minted within the same `familyId`.
  - **Reuse Detection:** If an incoming refresh token already has `usedAt !== null`, immediate compromise is detected and all tokens sharing its `familyId` are instantly revoked (`revokedAt = now`), returning `401 INVALID_REFRESH_TOKEN`.

### 5.3 Automated Mutation Audit Logging
All mutating administrative operations executed on the mock backend append an immutable `AuditLogRow` to the beginning of `mockDb.auditLogs`:
| Operation | HTTP Endpoint | Audit Action Type | Justification Captured |
| :--- | :--- | :--- | :--- |
| Suspend User | `POST /admin/users/:userId/suspend` | `USER_SUSPEND` | Request `reason` / note |
| Unsuspend User | `POST /admin/users/:userId/unsuspend` | `USER_SUSPEND` | Administrative reactivation |
| Provision Collector | `POST /admin/collectors` | `COLLECTOR_PROVISION` | Collector name & email |
| Update Collector | `PUT /admin/collectors/:collectorId` | `FLEET_UPDATE` | Collector profile update |
| Deactivate Collector | `POST /admin/collectors/:collectorId/deactivate` | `FLEET_UPDATE` | Account deactivation |
| Register Bin | `POST /admin/bins` | `FLEET_UPDATE` | Serial number & district |
| Assign Bin | `POST /admin/bins/:binId/assignment` | `BIN_ASSIGN` | Collector name & bin ID |
| Adjust Points | `POST /admin/ledger/adjustments` | `LEDGER_ADJUSTMENT` | Adjustment delta & reason note |
| Create Reward | `POST /admin/catalog` | `CATALOG_CHANGE` | Reward title & points cost |
| Update Reward | `PUT /admin/catalog/:rewardId` | `CATALOG_CHANGE` | Reward title |
| Archive Reward | `POST /admin/catalog/:rewardId/archive` | `CATALOG_CHANGE` | Archival status change |


---

## 6. Route Guards, Routing Architecture & Sign-Out (Prompt 5)

### 6.1 Route Guard Hierarchy & Protection Matrix
All route access controls are functional guards implemented in `src/app/core/guards/auth/`:
- **`authGuard` (`CanActivateFn`):**
  - Allows immediate access if `AuthService.isAuthenticated()` is `true`.
  - When the access token is expired but `AuthService.hasRefreshToken()` is `true`, it initiates a single-flight background refresh via `performGuardRefresh(authService)`:
    - Success: Allows navigation to proceed (`true`).
    - Failure: Redirects to `/login?returnUrl=<targetUrl>` without loop.
    - Network Failure: Redirects to `/login` while preserving persistent credentials in `localStorage`.
  - When no session exists, creates a redirect `UrlTree` to `/login?returnUrl=<targetUrl>`, omitting `returnUrl` when targeting `/` or `/login`.
- **`guestGuard` (`CanActivateFn`):**
  - Protects the `/login` route.
  - Redirects authenticated users directly to the default admin landing route (`/overview`).
  - Allows unauthenticated guests through to the sign-in page.
- **`roleGuard` (`CanActivateFn`):**
  - Reads `route.data['roles']` using bracket index access.
  - Verifies that the current user's role (`authService.role()`) matches the required `UserRole.Admin`.
  - Missing roles metadata, missing user role, or non-admin roles automatically clear the session, trigger a toast notification (`Administrators only`), and redirect to `/login`.
- **`safeReturnUrl(raw: string | null): string | null`:**
  - Enforces strict open-redirect sanitization. Only internal paths starting with a single `/` are permitted; protocol-relative URLs (`//`), backslashes (`\`), schemes (`javascript:`, `http:`), and control characters are rejected (`null`).

### 6.2 Route Tree & Guard Assignments
```
/
├── (redirect) → /overview
├── login [guestGuard] → AuthLayout (Placeholder)
├── dev/components [unguarded] → ComponentsShowcase (Dev-only)
├── (admin shell) [authGuard, roleGuard: SYS_ADMIN] → AdminLayout
│   ├── overview → RoutePlaceholder (title: 'Overview')
│   ├── bins → RoutePlaceholder (title: 'Bins List')
│   ├── bins/map → RoutePlaceholder (title: 'Live Bin Map')
│   ├── recyclers → RoutePlaceholder (title: 'Recyclers')
│   ├── collectors → RoutePlaceholder (title: 'Collectors')
│   ├── wallet → RoutePlaceholder (title: 'Wallet & Ledger')
│   ├── review-queue → RoutePlaceholder (title: 'AI Review Queue')
│   ├── survey-qa → RoutePlaceholder (title: 'Survey QA')
│   ├── rewards → RoutePlaceholder (title: 'Rewards Catalog')
│   ├── leaderboards → RoutePlaceholder (title: 'Leaderboards & Badges')
│   └── audit-logs → RoutePlaceholder (title: 'Audit Logs')
└── ** [unguarded] → NotFound
```

### 6.3 UI Navigation Labeling Discrepancies vs PDF Mockups
Identified label refinements between the preliminary PDF mockups and the production admin navigation specification:
1. **AI Review Queue (`/review-queue`):** Labeled as "Reports" on PDF screen p9; standardized to "AI Review Queue" in `admin-nav.ts` to clearly denote the AI confidence review queue workflow.
2. **Rewards Catalog (`/rewards`):** Labeled as "Rewards" on PDF screen p12/p14; standardized to "Rewards Catalog" in `admin-nav.ts`.
3. **Bins List (`/bins`):** Labeled as "Bins" on PDF screen p3; standardized to "Bins List" in `admin-nav.ts` to distinguish from "Live Bin Map" (`/bins/map`).
4. **Leaderboards & Badges (`/leaderboards`):** Labeled as "Leaderboards" on PDF screen p15; standardized to "Leaderboards & Badges" in `admin-nav.ts`.
5. **Profile Settings / Preferences (Topbar Shell):** PDF screen p1 displays "Profile settings" and "Preferences" in the user block dropdown menu. No corresponding screens or APIs exist in backend specifications; these options remain non-navigating placeholders while "Sign out" triggers `AuthService.logout()` and redirects to `/login`.
