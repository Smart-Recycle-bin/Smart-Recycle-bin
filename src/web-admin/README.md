# EcoBin System Admin Dashboard (`web-admin`)

Central management portal for the EcoBin smart waste collection and recycling ecosystem. Built with Angular 22 standalone components, Signals, OnPush change detection, Tailwind CSS v4, and Vitest.

---

## 1. Setup & Configuration

### Runtime Configuration (Google Maps)
The portal loads Google Maps parameters at runtime without compiling credentials into bundle code:
1. Copy `public/config.example.json` to `public/config.json`:
   ```bash
   cp public/config.example.json public/config.json
   ```
2. Insert your Google Maps API key into `public/config.json`.
3. Note: `public/config.json` is gitignored and excluded from production builds.

---

## 2. Running the Application

### Option A: In-Memory Mock Backend (Default)
Runs locally with zero external backend dependencies. The in-memory mock engine intercepts `/api/v1` traffic with realistic seeds, simulated 400ms latency, and JWT refresh token rotation:

```bash
npm start
# or
ng serve
```
Navigate to `http://localhost:4200/`. Seeded admin credentials:
- `admin@ecobin.eg` / `password123` (Laila Hamdy, System Admin)
- `amr.shawky@ecobin.eg` / `password123` (Amr Shawky, System Admin)

### Option B: Real Backend API
To run against a live backend service without editing environment files, use the dedicated `local-api` configuration. It proxies `/api/v1` requests through `proxy.conf.json` (defaults to `http://localhost:5000`):

```bash
npm run start:api
# or
ng serve --configuration=local-api
```

---

## 3. Testing & Verification

| Command | Purpose |
|---|---|
| `npm test` | Executes the Vitest unit & integration test suite (`*.spec.ts`). |
| `npm run check:prod-bundle` | Builds production and strictly asserts zero mock leaks or secret patterns. |
| `npm run check:contrast` | Verifies WCAG AA color contrast across theme tokens. |
| `npm run e2e` | Runs local Playwright E2E and accessibility audits (local-only). |

---

## 4. Documentation & Standards

Authoritative project documentation is maintained in the `docs/` directory:
- [Architecture & Layers](docs/architecture.md)
- [Backend Contract & Gap Analysis](docs/gap_api.md)
- [Production Deployment & Security](docs/deployment.md)
- [Testing & Quality Assurance](docs/testing.md)
- [Frontend Scope & Feature Conventions](docs/frontend-scope.md)
