# Google Maps Developer Runbook & Troubleshooting Guide

This runbook guides developers through configuring, testing, and debugging Google Maps in the **EcoBin Web Admin** application.

> [!IMPORTANT]
> **API Key Safety Rule:** Never commit an actual Google API key to git. The repository enforces secret detection via `scripts/check-no-secrets.mjs` and vitest specs. In all documentation and tickets, always use the placeholder `YOUR_KEY`.

---

## 1. Quick Start Setup (Development Demo Key)

To view and interact with the live map during local development:

1. **Copy the example configuration:**
   ```bash
   cp public/config.example.json public/config.json
   ```
2. **Add your development demo key:**
   Open `public/config.json` and insert your key into the `apiKey` field:
   ```json
   {
     "googleMaps": {
       "apiKey": "YOUR_KEY",
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
3. **Verify `.gitignore` status:**
   `public/config.json` is gitignored. Verify that `git status` does not stage `public/config.json`.
4. **Start the local server:**
   ```bash
   npm start
   ```

---

## 2. Google Cloud Console Configuration

For the demo key to work correctly with the application:

1. **Enable Required APIs:**
   In Google Cloud Console, enable:
   - **Maps JavaScript API**
2. **Application Restrictions (Recommended for Production):**
   - In production, set **HTTP referrers (web sites)** to `https://admin.ecobin.com/*`.
   - In development, you may add `http://localhost:4200/*`.
3. **API Restrictions:**
   - Restrict the key to only use **Maps JavaScript API**.
4. **Create a Map ID (for Advanced Markers & Vector Maps):**
   - Navigate to **Maps Management** in Google Cloud Console.
   - Create a Map ID named `DEMO_MAP_ID` with Map type set to **JavaScript** (Vector or Raster).

---

## 3. Testing with Strict Content Security Policy (CSP)

To verify that the application and Google Maps function seamlessly behind a strict Content Security Policy:

```bash
npx ng serve --configuration=csp
```

This configuration serves the app on `http://localhost:4200` with the production CSP HTTP header:
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: https://maps.googleapis.com https://*.googleapis.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
```

---

## 4. Quota Protection & Reload Budget Limit

To prevent inadvertent quota exhaustion caused by runaway reactive loops or frequent hot-reloads:
- `MapLoadBudgetService` enforces a strict budget limit of **8 Map instantiations per tab session**.
- Once the 8th Map is created, any subsequent attempt triggers the `budget-exceeded` state in `app-map-unavailable`.
- The user is notified: *"Map reload limit reached to protect your Google quota. Reload the page to continue."*
- In development mode (`ngDevMode`), inspect current budget counters in the browser console via:
  ```javascript
  console.log(window.__mapInits);
  // Output: { session: 2, page: 1, limit: 8 }
  ```

---

## 5. Map Loader States & Troubleshooting Guide

The `app-map-unavailable` component surfaces distinct, actionable guidance for each loader state:

| State | User-Facing Message | Root Cause & Resolution |
| :--- | :--- | :--- |
| **`not-configured`** | *"Google Maps Not Configured"* | `public/config.json` is missing or has an empty `apiKey`. Copy `public/config.example.json` to `public/config.json` and set your key. |
| **`auth-failed`** | *"Maps Authentication Failed"* | Google Maps fired `window.gm_authFailure`. The key is invalid, deleted, expired, or Maps JavaScript API is not enabled on the project. |
| **`network-error`** | *"Network Error Loading Map"* | The script tag failed to download (`script.onerror`). Check internet connection, corporate firewalls, or verify that CSP allows `maps.googleapis.com`. Click **Retry loading map**. |
| **`timeout`** | *"Map Load Timed Out"* | Google Maps did not initialize within 15 seconds. May indicate severe network latency or proxy stalls. Click **Retry loading map**. |
| **`budget-exceeded`** | *"Map Reload Limit Reached"* | 8 Map instances created in current tab session. Click **Reload page** to restart the tab session budget. |

---

## 6. Secret Scanning & Build Verification

Before committing code or submitting pull requests, run:

```bash
# 1. Run all unit tests including secret guard
npm test -- --watch=false

# 2. Run production build and secret / mock leakage verification
npm run check:prod-bundle
```

`scripts/check-no-secrets.mjs` scans all tracked files and the `dist/` directory for the Google API key pattern (`AIza...`). Any match will cause the command to fail.
