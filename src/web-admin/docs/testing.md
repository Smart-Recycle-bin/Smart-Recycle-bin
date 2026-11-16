# EcoBin Web Admin — Testing & Quality Assurance Guide

This guide covers the testing architecture, execution commands, accessibility and dark-mode audit baselines, and CI workflows for the EcoBin Web Admin portal.

---

## 1. Test Suite Structure

The repository maintains two primary automated testing layers:
1. **Unit & Integration Tests (Vitest + Angular TestBed):**
   - Located alongside source code (`*.spec.ts`).
   - Validates components, services, pipes, guards, forms, error handling, and mock backend handlers.
2. **End-to-End & Audit Tests (Playwright + Axe-core):**
   - Located in `e2e/`.
   - Uses an isolated Angular `e2e` build configuration with real browser automation (Chromium & Firefox).
   - Validates session security, routing responsiveness, paged list race conditions, complex form workflows, focus traps, accessibility (WCAG AA), and dark mode surface theming.

---

## 2. Test Execution Commands

| Command | Purpose |
|---|---|
| `npm run test` | Runs the full unit test suite with Vitest. |
| `npm run check:prod-bundle` | Compiles production bundle and asserts zero mock leaks. |
| `npm run e2e` | Runs headless Playwright E2E and audit tests across Chromium and Firefox. |
| `npm run e2e:ui` | Launches Playwright interactive test runner UI. |
| `npm run e2e:install` | Downloads necessary Playwright browser binaries. |

---

## 3. End-to-End Environment Configuration

E2E tests execute against an Angular application started with `--configuration e2e`:
- **Mock Backend:** `useMockBackend: true` (hermetic, runs without external backend dependency).
- **Mock Latency:** `mockLatencyMs: 50` (deterministic network delay).
- **Access Token TTL:** `mockAccessTokenTtlSeconds: 8` (allows rapid verification of JWT expiration and refresh token rotation in browser tests).
- **Call Counting:** Exposes `window.__mockCalls` counter to assert on search debouncing and cancellation without fragile network mocking.

---

## 4. Accessibility & Dark Mode Baselines (Ratchet Policy)

The E2E suite enforces a strict **ratchet policy** via two baseline files:
- `e2e/a11y-baseline.json`: Known accessibility violations (WCAG 2.1 AA serious/critical) per route and theme.
- `e2e/dark-allowlist.json`: Allowed light surfaces in dark mode (elements with area > 1500 px² and relative luminance > 0.72).

### Ratchet Rules:
1. **No Regressions:** Any new or unexpected violation fails the test.
2. **Strict Shrinking:** If a previously known violation is fixed (no longer occurs during the audit), the test **FAILS** with a `[RATCHET]` error. The developer must remove the resolved entry from the baseline file. Baselines can only shrink, never grow silently.

### Updating / Re-recording Baselines:
To re-record baselines after fixing issues or adding audited surfaces:
```bash
# On Linux / macOS / Bash:
RECORD_BASELINES=1 npm run e2e -- a11y.spec.ts dark.spec.ts

# On Windows PowerShell:
$env:RECORD_BASELINES="1"; npx playwright test a11y.spec.ts dark.spec.ts; Remove-Item Env:\RECORD_BASELINES
```

---

## 5. Adding New Routes to the E2E Sweep

When introducing a new feature route (e.g. `/analytics/reports`):
1. Add the path to the route lists:
   - `ADMIN_ROUTES` in `e2e/routes.spec.ts`
   - `ROUTES_TO_AUDIT` in `e2e/a11y.spec.ts`
   - `ROUTES_TO_CHECK` in `e2e/dark.spec.ts`
2. Run the suite with `RECORD_BASELINES=1` to establish initial baseline entries for the new route.
3. Commit the updated spec files and JSON baselines.

---

## 6. Continuous Integration (GitHub Actions)

The `.github/workflows/ci.yml` workflow includes:
- **web-admin-ci:** Installs dependencies, runs unit tests, verifies production bundle leaks, and compiles production artifacts.
- **web-admin-e2e:** Installs Playwright browser dependencies and runs the E2E and accessibility test suite on Chromium.
