# EcoBin System Admin Dashboard (`web-admin`)

<div dir="rtl">

### البدء السريع (باللغة العربية)
لوحة التحكم المركزية لمنظومة صناديق التدوير الذكية **EcoBin**، مخصصة لمسؤولي النظام لإدارة الأسطول، وصناديق التدوير، وعمليات الجمع الميدانية، ومراجعة التقارير وسجلات النظام. مبنية بأحدث معايير **Angular 22** مع إشارات (Signals) وتصميم حديث يدعم الوضعين الفاتح والداكن.

**متطلبات التشغيل:**
- تثبيت Node.js الإصدار 22 فما فوق و npm 10 فما فوق.

**أوامر التشغيل السريع:**
```bash
# 1. تثبيت الحزم بدقة وفق package-lock.json
npm ci

# 2. تشغيل التطبيق بالخادم الوهمي المدمج (Mock Backend)
npm start

# 3. تشغيل التطبيق مع خادم حقيقي أو محاكي محلي (Local API)
npm run start:api
```
يفتح التطبيق على الرابط: `http://localhost:4200`  
بيانات الدخول الافتراضية: `admin@ecobin.eg` / `password123`

</div>

---

## 1. Application Purpose & Real Routes

The EcoBin `web-admin` portal is an enterprise operations console for smart waste and recycling bin networks across urban districts. It provides real-time telemetry, fleet tracking, manual inspections, ledger tracking, reward catalog management, and compliance auditing.

### Application Routes

| Path | Component / Target | Purpose & Screen Context | Guards / Role Access |
| :--- | :--- | :--- | :--- |
| `/login` | `Login` (`AuthLayout`) | Administrator authentication form with credentials mode support | `guestGuard` |
| `/overview` | `Overview` (`AdminLayout`) | Executive KPI cards, regional recycling charts, fill level distributions, hotspot alerts | `authGuard`, `roleGuard` (`Admin`) |
| `/bins` | `BinsList` (`AdminLayout`) | Fleet registry of physical smart recycling bins, status filters, device registration modal | `authGuard`, `roleGuard` (`Admin`) |
| `/bins/map` | `LiveBinMap` (`AdminLayout`) | Live Google Map tracking telemetry, custom teardrop markers, density-aware zoom, cluster feeds | `authGuard`, `roleGuard` (`Admin`) |
| `/recyclers` | `Recyclers` (`AdminLayout`) | Recycler user accounts, phone search, eco-point balances, suspension modals | `authGuard`, `roleGuard` (`Admin`) |
| `/collectors` | `Collectors` (`AdminLayout`) | Field collector accounts provisioning, district filter, assigned smart bins drawer, status toggling | `authGuard`, `roleGuard` (`Admin`) |
| `/wallet` | `Ledger` (`AdminLayout`) | Immutable double-entry eco-points ledger, transaction audit history, manual adjustments | `authGuard`, `roleGuard` (`Admin`) |
| `/review-queue` | `ReviewQueue` (`AdminLayout`) | Manual inspection queue of computer vision classification exceptions | `authGuard`, `roleGuard` (`Admin`) |
| `/review-queue/:reportId` | `ReportDetail` (`AdminLayout`) | Detailed inspection inspection review, AI vs reality labeling, correction and retrain action | `authGuard`, `roleGuard` (`Admin`) |
| `/survey-qa` | `SurveyQa` (`AdminLayout`) | Recycler user satisfaction surveys, feedback metrics, AI classification accuracy QA | `authGuard`, `roleGuard` (`Admin`) |
| `/rewards` | `Catalog` (`AdminLayout`) | Eco-reward catalog vouchers, inventory limits, voucher upload drawer | `authGuard`, `roleGuard` (`Admin`) |
| `/leaderboards` | `Leaderboards` (`AdminLayout`) | Top community recyclers ranking, milestone achievement badges, weekly/all-time scopes | `authGuard`, `roleGuard` (`Admin`) |
| `/audit-logs` | `AuditLogs` (`AdminLayout`) | Security and compliance audit log, administrator mutating actions, actor filtering | `authGuard`, `roleGuard` (`Admin`) |
| `/dev/components` | `ComponentsShowcase` | Isolated design system primitive preview (active only during `ngDevMode`) | Dev Mode Only |
| `**` | `NotFound` | Friendly branded 404 recovery page with smiling smart bin illustration and context-aware navigation | Public |

---

## 2. Tech Stack & Dependencies

Built with a zero-runtime-overhead architectural approach:

| Technology / Library | Version | Role in Architecture |
| :--- | :--- | :--- |
| **Angular** | `^22.1.0` | Frontend application framework: standalone components, signals, `computed`, `input()`, `output()` |
| **TypeScript** | `~6.0.2` | Strictly typed ECMAScript dialect with path aliases and no implicit any |
| **Tailwind CSS** | `^4.1.12` | Utility-first CSS framework with `@theme inline` tokens, PostCSS v4 engine |
| **Vitest** | `^4.0.8` | High-performance unit test runner via `@angular/build:unit-test` |
| **@angular/google-maps** | `^22.1.0` | Official Angular Google Maps wrapper for vector maps and Advanced Markers |
| **@types/google.maps** | `^3.66.10` | Full TypeScript typings for Google Maps JavaScript API |
| **Lucide** | `^1.71.0` | Modern, consistent icon library used with zero innerHTML rendering |
| **RxJS** | `~7.8.0` | Reactive asynchronous streams used with interop signals and `createPagedList` |
| **Playwright** | `^1.65.1` | Local end-to-end integration and accessibility test suite |

---

## 3. Quick Start

### Prerequisites
- **Node.js**: `v22.x` or higher (verified with Node.js 22 LTS).
- **npm**: `v10.x` or higher (configured for `npm@11.17.0`).

### Installation
Always use `npm ci` to install exact dependencies from `package-lock.json`:
```bash
npm ci
```

### Running with In-Memory Mock Backend (Default)
Runs entirely inside the browser with realistic initial seed data, simulated network latency (400ms), and JWT refresh token rotation:
```bash
npm start
```
Navigate to `http://localhost:4200/`.

#### Seeded Credentials
| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@ecobin.eg` | `password123` | Full administrative privileges across all modules |
| **System Admin** | `amr.shawky@ecobin.eg` | `password123` | Full administrative privileges |
| **Wrong Password Test** | *Any email* | `wrongpass` | Triggers simulated 401 INVALID_CREDENTIALS error |

### Running with Real Backend (Local Proxy)
When connecting to a live or simulated backend server running on port `5000`:
```bash
npm run start:api
```
This runs `ng serve --configuration=local-api`, which disables the in-memory mock engine and routes `/api/v1` through `proxy.conf.json`.

---

## 4. Scripts Reference Table

| npm Script | Terminal Command | Purpose & Description |
| :--- | :--- | :--- |
| `npm start` | `ng serve --configuration=development` | Runs local dev server on `http://localhost:4200` with mock backend enabled. |
| `npm run start:api` | `ng serve --configuration=local-api` | Runs dev server proxying `/api/v1` to `http://localhost:5000` with mock disabled. |
| `npm run start:csp` | `ng serve --configuration=csp` | Runs dev server enforcing production Content-Security-Policy headers. |
| `npm run build` | `ng build` | Compiles an optimized, tree-shaken production bundle into `dist/ecobin-admin`. |
| `npm run watch` | `ng build --watch --configuration development` | Incremental development build watching for file changes. |
| `npm test` | `ng test` | Runs the full Vitest unit and integration test suite (`*.spec.ts`). |
| `npm run check:prod-bundle` | `ng build && node scripts/check-prod-bundle.cjs && node scripts/check-no-secrets.mjs` | Builds production and asserts zero mock leaks, credential strings, or secret keys. |
| `npm run check:contrast` | `node scripts/check-contrast.mjs` | Validates WCAG AA 4.5:1 / 3:1 color contrast across all semantic CSS tokens. |
| `npm run e2e` | `playwright test` | Runs end-to-end browser workflows and axe-core accessibility evaluations. |
| `npm run e2e:ui` | `playwright test --ui` | Launches interactive Playwright UI runner. |
| `npm run e2e:install` | `playwright install --with-deps` | Downloads browser binaries for local Playwright runs. |

---

## 5. Configuration & Environments

### Runtime Configuration (`public/config.json`)
The application loads environmental parameters (such as the Google Maps API key) at runtime from `public/config.json` via `AppConfigService`:
1. Copy the example configuration:
   ```bash
   cp public/config.example.json public/config.json
   ```
2. Insert your demo or staging API key:
   ```json
   {
     "googleMaps": {
       "apiKey": "AIza…****",
       "mapId": "DEMO_MAP_ID",
       "version": "quarterly",
       "language": "en",
       "region": "EG"
     },
     "map": {
       "refreshSeconds": 30
     }
   }
   ```
> [!IMPORTANT]
> `public/config.json` is strictly gitignored and excluded from production builds (`angular.json`). Never commit real keys.

### Build Configurations (`angular.json`)
- **`production`**: Full minification, dead-code elimination, strict budget assertions, mock engine excluded via `ngDevMode`.
- **`development`**: Source maps enabled, mock engine active, hot module reloading.
- **`local-api`**: Disables mock backend (`useMockBackend: false`), routes network traffic via `proxy.conf.json`.
- **`e2e`**: Deterministic test fixtures, disabled animations, zero network flakiness.
- **`csp`**: Injects strict production Content Security Policy HTTP headers on local serve.

---

## 6. Project Structure

```
src/
├── app/
│   ├── core/                        # Singletons, contracts & core infrastructure
│   │   ├── errors/                  # ApiError, AuthError, error normalizers
│   │   ├── guards/                  # Functional route guards (auth, guest, role)
│   │   ├── interceptors/            # auth, error, mock-backend interceptors
│   │   ├── mock/                    # In-memory mock database & fixture seed data
│   │   ├── models/                  # Domain models, DTOs, enums, view models
│   │   ├── routing/                 # TitleStrategy, route utilities
│   │   └── services/                # Singleton domain services
│   ├── features/                    # Routed domain feature modules
│   │   ├── analytics/overview/      # Executive KPIs, charts, hotspots
│   │   ├── audit/audit-logs/        # System immutable audit log table
│   │   ├── auth/login/              # Administrator authentication form
│   │   ├── bin/                     # Bins list & Live Google Maps tracking
│   │   ├── collector/collectors/    # Fleet collector management & drawer
│   │   ├── errors/not-found/        # 404 error page
│   │   ├── gamification/            # Leaderboards & recycler badges
│   │   ├── inspection/              # Review queue & report detail review
│   │   ├── reward/catalog/          # Reward catalog, image upload, drawer
│   │   ├── survey/survey-qa/        # User feedback & survey QA metrics
│   │   ├── user/recyclers/          # Recycler accounts & suspension modal
│   │   ├── wallet/ledger/           # Points ledger & manual adjustments
│   │   └── dev/components-showcase/ # Design system component showcase
│   ├── layouts/                     # Shell application layouts
│   │   ├── admin-layout/            # Admin sidebar, topbar, content outlet
│   │   └── auth-layout/             # Split-screen authentication layout
│   └── shared/                      # Reusable UI primitives
│       ├── components/              # Avatar, Badge, Button, Drawer, Modal, Table...
│       ├── pipes/                   # DateTime, DateOnly pipes
│       ├── utils/                   # createPagedList, datetime formatters
│       └── validators/              # Common form validation helpers
├── environments/                    # Environment build targets
├── styles.css                       # Global theme tokens, typography, scrollbars
└── testing/                         # Shared Vitest test harnesses & fake maps
```

---

## 7. How the Application Works

### 7.1 Fine-Grained Signals Architecture
The application avoids heavyweight state management libraries, relying entirely on Angular Signals:
- Writable signals hold authoritative localized state (`signal<T>()`).
- Derived values use `computed()`, re-evaluating only when dependencies change.
- Side effects (such as theme synchronizations or URL query synchronizations) use `effect()`.

### 7.2 Interceptor Chain
Requests flow through an explicit, deterministic interceptor pipeline (`app.config.ts`):
1. **`errorInterceptor` (Outermost):** Catches HTTP errors, normalizes them into structured `ApiError` objects, dispatches deduplicated toast notifications.
2. **`authInterceptor` (Middle):** Attaches `Authorization: Bearer <token>`, manages single-flight token refresh coalescing on 401 Unauthorized, and retries the failed request once.
3. **`mockBackendInterceptor` (Terminal / Innermost):** Intercepts API requests when `environment.useMockBackend` is enabled. Gated by `(typeof ngDevMode === 'undefined' || ngDevMode)` so that production builds tree-shake mock code entirely.

### 7.3 `createPagedList` Utility
Tabular data views employ the `createPagedList` utility (`@shared/utils/paged-list.ts`), which automatically manages:
- Debounced search queries (300ms default)
- Immediate sorting and page navigation
- In-flight request cancellation via `switchMap`
- Automatic page reset on filter change and smooth background refetches without row flashing

---

## 8. Development & Design Conventions

1. **Standalone Components & OnPush:** All components are standalone with `changeDetection: ChangeDetectionStrategy.OnPush`.
2. **Strict Design Tokens:** Never write raw color literals (`#...`, `rgba(...)`) in component templates or stylesheets. Always reference CSS variables (`var(--primary)`, `var(--surface)`, `var(--text)`, etc.) defined in `src/styles.css`.
3. **Zero `innerHTML` for Dynamic DOM:** Custom map markers and dynamic UI elements are constructed strictly via `document.createElement` / `document.createElementNS` and `textContent` to guarantee zero XSS attack vectors.
4. **Path Aliases:** Use configured path aliases instead of relative directory traversals:
   - `@core/*`, `@shared/*`, `@features/*`, `@models/*`, `@services/*`, `@env/*`, `@testing/*`.

---

## 9. Testing & Quality Assurance

### Unit & Integration Testing
Run the complete Vitest test suite:
```bash
npm test -- --watch=false
```
To run targeted tests for a specific feature:
```bash
npm test -- --watch=false --include=src/app/features/bin/live-bin-map/**/*.spec.ts
```

### Fake Google Maps Test Harness
Unit tests do not make real network calls to Google Maps. The `@testing/fake-google-maps` harness mocks `importLibrary`, `Map`, `AdvancedMarkerElement`, and `LatLngBounds` with instance tracking and lifecycle spies.

### Automated Theme & Secret Scanners
- `npm run check:contrast`: Calculates WCAG 2.1 AA luminance ratios across `:root` and `.dark` palettes.
- `src/app/theme-tokens.spec.ts`: Scans all template and stylesheet files to guarantee that no unauthorized color literals exist.
- `scripts/check-no-secrets.mjs`: Scans the entire codebase and `dist/` artifacts to prevent secret key leakage.

---

## 10. Production Build & Deployment

### Production Compilation
```bash
npm run build
```
Generates production assets in `dist/ecobin-admin/browser`.

### Verification Pipeline
Before deploying to production, run:
```bash
npm run check:prod-bundle
```
This command compiles the production bundle and validates:
- No test passwords or mock credential strings exist in the bundle.
- No mock database fixtures are bundled into the binary.
- No Google Maps API keys or secret patterns are exposed.

### Content Security Policy (CSP)
Production web servers (e.g. Nginx, Cloudflare) must serve the application with the following Content Security Policy:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: https://maps.googleapis.com https://*.googleapis.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

---

## 11. Real Backend Integration Checklist

To connect `web-admin` to a live backend environment:

1. **Verify Backend Endpoints:** Ensure the backend implements the endpoints specified in `docs/gap_api.md`.
2. **Start the Dev Proxy:**
   ```bash
   npm run start:api
   ```
3. **Verify Proxy Target:** If the backend runs on a host other than `http://localhost:5000`, adjust the `target` in `proxy.conf.json`.
4. **Backend Simulation Server:** To test without a full backend deployment, run the included simulator:
   ```bash
   node scripts/simulate-real-backend.cjs
   ```
   This runs an Express server on `http://localhost:5000` supporting auth, bins, collectors, and inspections.

---

## 12. Troubleshooting & FAQ

### Google Maps Loader States

| State | Displayed Message | Cause & Resolution |
| :--- | :--- | :--- |
| **`not-configured`** | *"Google Maps Not Configured"* | `public/config.json` is missing or `apiKey` is empty. Copy `public/config.example.json` to `public/config.json` and set your key. |
| **`auth-failed`** | *"Maps Authentication Failed"* | Google Maps returned `gm_authFailure`. Check that the API key is active and Maps JavaScript API is enabled in Google Cloud Console. |
| **`network-error`** | *"Network Error Loading Map"* | Script download blocked by network, ad-blocker, or firewall. Check CSP directives and internet connectivity. |
| **`timeout`** | *"Map Load Timed Out"* | Google Maps took longer than 15 seconds to load. Click **Retry loading map**. |
| **`budget-exceeded`** | *"Map Reload Limit Reached"* | Safety quota guard triggered (8 map instantiations reached in single tab session). Reload page to reset. |

### Markers Are Not Visible on the Map
- **Resolution:** Verify that `BinMapCanvas` has `encapsulation: ViewEncapsulation.None` and marker rules are namespaced under `app-bin-map-canvas .bin-marker`. Custom DOM nodes attached to Google Maps overlays exist outside Angular's emulated scoping attributes.

### "Can't bind to X since it isn't a known property"
- **Resolution:** Verify that the standalone component is listed in the `@Component({ imports: [...] })` array of the consuming component.

---

## 13. Documentation Index

For detailed architectural specifications and design decisions, refer to:
- [Architecture & Layers Reference](docs/architecture.md)
- [Google Maps Developer Runbook](docs/maps-runbook.md)
- [Backend REST API Contract & Gap Analysis](docs/gap_api.md)
- [Production Deployment & Security Hardening](docs/deployment.md)
- [Testing & Quality Assurance Guide](docs/testing.md)
- [Frontend Scope & UI Specifications](docs/frontend-scope.md)
- [Refactor & Hardening Verification Report](docs/file-report.md)
