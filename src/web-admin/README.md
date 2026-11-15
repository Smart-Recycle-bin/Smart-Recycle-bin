# EcoBin System Admin Dashboard (`web-admin`)

Central management portal for the EcoBin smart waste collection and recycling ecosystem. Built with Angular 22 standalone components, Signals, OnPush change detection, Tailwind CSS v4, and Vitest.

---

## Run & Development Guide

### 1. Development with In-Memory Mock Backend (Default)
Runs locally with zero external backend dependencies. The in-memory mock engine intercepts all `/api/v1` traffic with realistic seeds, simulated 400ms latency, and JWT refresh token rotation:

```bash
npm start
# or
ng serve
```
Navigate your browser to `http://localhost:4200/`. Seeded admin credentials:
- `admin@ecobin.eg` / `password123` (Laila Hamdy, System Admin)
- `amr.shawky@ecobin.eg` / `password123` (Amr Shawky, System Admin)

*Note: The mock backend validates email format (returning `400 VALIDATION_ERROR` for malformed emails) and authenticates against seeded admins (returning `401 INVALID_CREDENTIALS` for unknown accounts or incorrect passwords).*

### 2. Development against Real Backend API
To develop against a live backend service running locally (e.g. at `http://localhost:5000`), update `proxy.conf.json` if needed with your backend host, set `useMockBackend: false` in `src/environments/environment.development.ts`, and run:

```bash
ng serve --proxy-config proxy.conf.json
```
All calls to `/api` are automatically proxied to the configured backend target.

### 3. Production Build
Generates optimized, AOT-compiled production artifacts under `dist/ecobin-admin/browser`. Gated by `ngDevMode`, the mock backend engine and all mock data seeds are completely tree-shaken from production bundles:

```bash
npm run build
# or
ng build
```

### 4. Verify Production Bundle (Zero Mock Leaks)
Runs a production build and strictly verifies that no mock credentials (`wrongpass`, `mock_jwt`), mock handlers, or sample identities (`Laila Hamdy`) leak into production JavaScript chunks:

```bash
npm run check:prod-bundle
```

### 5. Running Unit Tests
Executes the comprehensive Vitest test suite covering domain models, services, interceptors, guards, and components:

```bash
npm test
# or
ng test
```
