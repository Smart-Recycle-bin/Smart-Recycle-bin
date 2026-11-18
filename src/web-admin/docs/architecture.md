# EcoBin Web Admin — Architecture Reference & System Manual

## 1. Executive Summary & Key Technical Baseline

The **EcoBin Web Admin** application is an enterprise administration portal for smart waste management, automated recycling bins, AI classification review queues, and reward ledger auditing.

### 1.1 Technical Specifications

| Dimension | Specification | Notes |
| :--- | :--- | :--- |
| **Framework** | Angular 22.1.0 | Standalone components, Signals, OnPush change detection |
| **Language** | TypeScript ~6.0 | Strict mode, path-aliased imports, zero deep `../../` paths |
| **Styling** | Tailwind CSS v4 + Semantic CSS Variables | Light & dark theme tokens, WCAG 2.1 AA compliant |
| **Build System** | `@angular/build` (esbuild / Vite) | Multi-target configurations (`production`, `development`, `local-api`, `e2e`) |
| **Test Runner** | Vitest via `@angular/build:unit-test` | 119 spec files, 687 tests passing, < 20s total run |
| **Mapping Engine** | `@angular/google-maps` (v22.1.0) | Dynamic runtime loader, CSP-compliant, load-budgeted |
| **Iconography** | Lucide (`lucide` 1.71.0) | Centralized SVG icon registry component (`<app-icon>`) |
| **Typography** | Inter Variable (`@fontsource-variable/inter`) | Self-hosted, zero external font CDN dependency |

---

## 2. Angular 22 & TypeScript Architecture

### 2.1 Reactivity & State Primitives
- **Angular Signals:** All component UI states, user inputs, and derived properties are modeled as signals (`signal()`, `computed()`).
- **Input & Output Signals:** Inputs use the signal-based `input()` and `input.required()` API. Component outputs use the `output()` API.
- **OnPush Change Detection:** Every component across `src/app/` explicitly specifies `changeDetection: ChangeDetectionStrategy.OnPush`. Zone.js change cycles are strictly localized to signal graph changes.
- **Dependency Injection:** Services and tokens are resolved exclusively via functional `inject()` calls at property declaration time, eliminating boilerplate constructor parameters.
- **Lifecycle & Stream Teardown:** RxJS streams subscribed inside components leverage `takeUntilDestroyed(this.destroyRef)` for automatic unsubscription on view destruction.

### 2.2 Path Aliases & Module Resolution
The project uses eight TypeScript path aliases configured in `tsconfig.json`:

| Alias | Target Path | Description |
| :--- | :--- | :--- |
| `@env/*` | `src/environments/*` | Environment configuration definitions |
| `@core/*` | `src/app/core/*` | Core guards, interceptors, errors, routing |
| `@models/*` | `src/app/core/models/*` | Strongly-typed DTOs, enums, view models |
| `@services/*` | `src/app/core/services/*` | Singleton HTTP and state services |
| `@shared/*` | `src/app/shared/*` | Reusable UI components, pipes, utilities |
| `@features/*` | `src/app/features/*` | Feature screens and sub-components |
| `@layouts/*` | `src/app/layouts/*` | Shell layouts (`AdminLayout`, `AuthLayout`) |
| `@testing/*` | `src/testing/*` | Test harnesses (`fake-google-maps`) |

---

## 3. Layering & Folder Structure

```
src/
├── app/
│   ├── core/                        # Singleton infrastructure & contracts
│   │   ├── errors/                  # ApiError, AuthError, error-message helpers
│   │   ├── guards/                  # Functional route guards (auth, guest, role)
│   │   ├── interceptors/            # auth, error, mock-backend, shared utils
│   │   ├── mock/                    # In-memory mock database & fixture seed data
│   │   ├── models/                  # Domain DTOs, enums, view models, barrels
│   │   ├── routing/                 # Title strategy, route utilities
│   │   └── services/                # Singleton domain services
│   ├── features/                    # Routed feature modules
│   │   ├── analytics/overview/      # Executive KPIs, charts, hotspots
│   │   ├── audit/audit-logs/        # System immutable audit log table
│   │   ├── auth/login/              # Administrator authentication form
│   │   ├── bin/                     # Bins list & Live Google Maps tracking
│   │   ├── collector/collectors/    # Fleet collector management & assignment
│   │   ├── errors/not-found/        # 404 error page
│   │   ├── gamification/            # Leaderboards & recycler achievement badges
│   │   ├── inspection/              # Review queue & report detail review
│   │   ├── reward/catalog/          # Reward catalog, image upload, drawer
│   │   ├── survey/survey-qa/        # User feedback & survey QA metrics
│   │   ├── user/recyclers/          # Recycler accounts & suspension modal
│   │   ├── wallet/ledger/           # Points ledger & credit/debit adjustments
│   │   └── dev/components-showcase/ # Design system component showcase
│   ├── layouts/                     # Shell application layouts
│   │   ├── admin-layout/            # Admin sidebar, topbar, content outlet
│   │   └── auth-layout/             # Split-screen authentication layout
│   └── shared/                      # Reusable UI primitives
│       ├── components/              # BrandLogo, Button, Input, Modal, Table...
│       ├── pipes/                   # Date, time, format pipes
│       └── utils/                   # createPagedList, datetime, format
├── environments/                    # Environment targets (prod, dev, local-api, e2e)
├── styles.css                       # Global theme tokens, typography, scrollbars
└── testing/                         # Shared Vitest test harnesses
```

---

## 4. State Management Strategy

### 4.1 Fine-Grained Signals Architecture
State management is localized to domain services and components using Angular Signals. Cross-component coordination relies on singleton services exposing `Signal<T>` accessors (e.g., `ThemeService.isDark`, `AuthService.currentUser`, `ReviewQueueStateService.pendingCount`).

### 4.2 The `createPagedList` Pattern
All tabular data screens use `createPagedList` (`@shared/utils/paged-list.ts`) rather than manual stream subscriptions:

```typescript
readonly pagedList = createPagedList<BinListItem, BinListQuery>({
  fetch: (query) => this.binsService.getBins(query),
  initial: { pageSize: 20, sortBy: 'createdAt', sortDir: 'desc' },
  debounceKeys: ['search'],
  debounceMs: 300,
});
```

- **Exposed Signals:** `items`, `total`, `totalPages`, `loading`, `refreshing`, `error`, `page`, `pageSize`, `sortBy`, `sortDir`, `filters`.
- **Race Condition Prevention:** Internally uses `switchMap` to cancel in-flight requests when query criteria change, preventing slow responses from overwriting newer user selections.
- **Debounced Inputs:** Search inputs are automatically debounced (default 300ms) while sort and pagination actions execute immediately.
- **Clamping & Resilience:** Resets `page` to 1 on filter changes. Preserves previous rows during background refreshes to eliminate UI flicker.

### 4.3 Live Maps & Custom Advanced Markers
Live bin tracking integrates Google Maps with fine-grained Angular signals:
- **Diff-Based Marker Reconciliation:** `diffBins` calculates added, removed, and updated bins across polling ticks, performing in-place DOM updates without re-instantiating `AdvancedMarkerElement`.
- **View Encapsulation & Pure DOM:** `BinMapCanvas` uses `ViewEncapsulation.None` with namespaced selectors (`app-bin-map-canvas .bin-marker`) to style custom DOM nodes rendered inside Google Maps' external overlay. Markers are built via pure DOM (`createElementNS`, Lucide `Recycle` icon) without `innerHTML`.
- **Zoom-Aware Density:** Bin labels are positioned above teardrop pins and visibility is coordinated with map zoom (hidden at zoom < 14, shown at zoom >= 14 or on hover/focus/selection).

---

## 5. Data Flow & Networking

### 5.1 HTTP Pipeline & Response Unwrapping
`ApiClientService` (`@services/api/api-client.service`) wraps Angular's `HttpClient` to provide strongly-typed operations. It automatically unwraps standard API envelopes:
- Standard response: `{ success: true, data: T }` → unwrapped to `T`.
- Paginated response: `{ success: true, data: T[], meta: PageMeta }` → unified `Page<T>` with fallback derivation.

### 5.2 Deterministic Interceptor Execution Chain
Interceptors run in strictly defined sequence (`src/app/app.config.ts`):
1. **`errorInterceptor` (Outermost):** Catches `HttpErrorResponse` and normalizes into `ApiError`. Dispatches user-friendly toasts (network errors, 403 forbidden, 5xx server faults). Dedupes duplicate toasts within 1,500ms.
2. **`authInterceptor` (Middle):** Attaches `Authorization: Bearer <token>`. Coordinates single-flight token refresh coalescing on HTTP 401 via `performRefresh()` and retries the failed request once.
3. **`mockBackendInterceptor` (Terminal / Innermost):** Intercepts requests when `environment.useMockBackend` is active. Gated by `(typeof ngDevMode === 'undefined' || ngDevMode)` for complete dead-code elimination in production.

### 5.3 Idempotency & Safe Retries
Mutating requests (POST, PUT, PATCH, DELETE) support the `Idempotency-Key` header via HTTP context tokens to ensure safe network retries without unintended duplicate operations.

---

## 6. Routing, Guards & Layout Architecture

### 6.1 Route Guard Hierarchy
- **`authGuard` (`CanActivateFn`):** Ensures an active session. If access token is expired, attempts a single-flight background refresh before proceeding or redirecting to `/login`.
- **`guestGuard` (`CanActivateFn`):** Prevents authenticated users from accessing `/login`, redirecting them to `/overview`.
- **`roleGuard` (`CanActivateFn`):** Inspects `route.data['roles']` to verify administrative authorization (`SYS_ADMIN`).
- **`safeReturnUrl`:** Validates and sanitizes return URL query parameters against open-redirect vulnerabilities.

### 6.2 Layout Architecture
- **`AdminLayout`:** The primary workspace shell featuring a responsive sidebar with smooth 0.34s collapse transition, a mobile slide-out drawer with backdrop, a topbar with notifications and profile menu, an offline banner, and a main content outlet with `scrollbar-gutter: stable`.
- **`AuthLayout`:** A clean split-screen layout with `BrandLogo`, theme toggle, and centered card panel.

### 6.3 Not Found (404) Route & Resilient Recovery
The catch-all route (`**`) is configured as a top-level route outside the authenticated workspace shell:
- **Title Strategy Integration:** Configured with `title: 'Page not found'`, which `AppTitleStrategy` resolves to `EcoBin Admin | Page not found`.
- **Top-Level Accessibility:** Positioned at the root routing level so that both unauthenticated visitors and logged-in administrators can access it seamlessly without guard interference.
- **Context-Aware Navigation Actions:**
  - When authenticated: Primary action routes to `/overview` ("Back to Overview").
  - When unauthenticated: Primary action routes to `/login` ("Go to sign in").
  - Secondary action: "Go back" triggers `Location.back()`, dynamically rendered only when browser history is available (`window.history.length > 1`).
- **XSS-Safe Requested Path Inspection:** Extracts `Router.url` pathname (stripping query parameters and hash fragments) and displays it in a sanitized monospace chip via Angular interpolation (`{{ requestedPath() }}`).
- **Zero-Dependency Brand Illustration:** Features an inline SVG illustration of a friendly smiling smart bin character acting as the "0" in "4 😊 4", using theme CSS tokens and `@media (prefers-reduced-motion: no-preference)` subtle animations.

---

## 7. Dual-Mode Backend Architecture (Mock vs. Real API)

The application provides seamless switching between the internal mock backend and an external real backend without requiring any source code modifications:

```
                  ┌──────────────────────┐
                  │ Angular Web Admin    │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [npm start]                       [npm run start:api]
   environment.development.ts        environment.local-api.ts
   useMockBackend: true              useMockBackend: false
   MockBackendInterceptor            Proxy -> http://localhost:5000
   In-memory MockDb                  Real REST API Endpoints
```

### 7.1 Developer Workflow Commands
- **`npm start`**: Runs the development server with the full hermetic mock backend on `http://localhost:4200`.
- **`npm run start:api`**: Runs the development server pointing to a local backend via `proxy.conf.json` proxying `/api/v1` to `http://localhost:5000`.
- **`node scripts/simulate-real-backend.cjs`**: A lightweight Node.js simulation server implementing real auth and bins responses to test live proxy configurations.

### 7.2 Production Tree-Shaking Guarantee
Production builds (`npx ng build`) set `production: true` and `useMockBackend: false`. All mock-related symbols, routes, handlers, and credentials in `login.ts` are gated via `(typeof ngDevMode === 'undefined' || ngDevMode) && environment.useMockBackend`, ensuring the compiler eliminates all mock code from production bundles. Verified by `npm run check:prod-bundle`.

---

## 8. Google Maps Integration

### 8.1 Runtime Loader & Key Management
Google Maps is loaded dynamically via `GoogleMapsLoaderService` (`@services/maps/google-maps-loader.service`). The API key is fetched at runtime from `public/config.json` with fallback to `environment.googleMapsApiKey`.

### 8.2 Content Security Policy (CSP)
The app implements strict CSP headers (configured in `angular.json` and documented in `docs/deployment.md`):
- `script-src 'self' https://maps.googleapis.com`
- `img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com`
- `connect-src 'self' https: https://maps.googleapis.com https://*.googleapis.com`

### 8.3 Rate Budgeting & Diagnostics
`MapLoadBudgetService` monitors Google Maps canvas initializations across route changes to enforce budget limits and prevent excessive API quota consumption.

---

## 9. Design System & Theme Tokens

### 9.1 Two-Tier Semantic Tokens
Tokens are declared in `src/styles.css` under `:root` (light) and `.dark` (dark):
- **Surfaces:** `--surface`, `--surface-raised`, `--surface-muted`, `--surface-sunken`
- **Borders:** `--border`, `--border-strong`
- **Text:** `--text`, `--text-muted`, `--text-inverse`
- **Brand & Actions:** `--primary`, `--primary-soft`, `--primary-strong`, `--primary-fg`
- **Feedback:** `--success-*`, `--warning-*`, `--danger-*`, `--info-*`, `--purple-*`
- **Scrollbars:** `--scrollbar-thumb`, `--scrollbar-thumb-hover`, `--scrollbar-track`

### 9.2 WCAG 2.1 AA Contrast Compliance
The design token palette is verified by `scripts/check-contrast.mjs`, which checks 34 distinct contrast pairs across light and dark modes with 0 failures (minimum 4.5:1 for body text, 3:1 for large text and UI boundaries).

### 9.3 Brand Logo Component
The standalone `BrandLogo` component (`<app-brand-logo>`) renders an inline SVG with the brand green recycler mark (`#009966`) and theme-adaptive wordmark and subtitle fills (`var(--text)` and `var(--text-muted)`), ensuring dark-mode legibility on raised surfaces.

---

## 10. Testing Strategy

### 10.1 Vitest Unit & Component Testing
- Tests execute with Vitest via `@angular/build:unit-test`.
- Colocated specs (`*.spec.ts`) cover components, services, pipes, guards, forms, and interceptors.
- Hermetic test harness `src/testing/fake-google-maps.ts` stubs Google Maps APIs to run tests in node environments without network dependencies.

### 10.2 Quality Automation Scripts
- `npm test`: Runs the complete Vitest test suite.
- `npm run check:prod-bundle`: Builds production bundles and scans for leaks of mock code, credentials, or development paths.
- `npm run check:contrast`: Validates WCAG AA color contrast across both themes.
- `node scripts/check-no-secrets.mjs`: Scans the repository and build outputs for unmasked Google Maps API keys.

---

## 11. Security Posture & Secret Management

1. **Google Maps API Key:** The production API key is not committed to source control. It resides in `public/config.json` (gitignored) and is loaded at runtime. `angular.json` excludes `config.json` from production asset copying.
2. **Key Masking:** Secrets are masked across documentation and logs as `AIza…****`.
3. **Token Rotation & Family Revocation:** Refresh tokens follow single-use rotation. Token reuse detection revokes all tokens within the compromised family.
4. **Open-Redirect Hardening:** Functional guards enforce `safeReturnUrl` validation before navigating post-authentication.

---

## 12. Operational Guide & Commands Reference

| Command | Description |
| :--- | :--- |
| `npm start` | Run local dev server with Mock Backend (`http://localhost:4200`) |
| `npm run start:api` | Run local dev server with Real API Proxy to `:5000` |
| `npm run start:csp` | Run local dev server enforcing strict production CSP headers |
| `npm run build` | Compile optimized production bundle to `dist/ecobin-admin` |
| `npm test` | Run Vitest unit test suite (119 files, 687 tests) |
| `npm run check:prod-bundle` | Build and verify production bundle has zero mock/credential leaks |
| `npm run check:contrast` | Audit WCAG 2.1 AA color contrast compliance |
| `node scripts/simulate-real-backend.cjs --test` | Self-test the real backend simulation server |
