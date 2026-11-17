# EcoBin Web Admin — Production Deployment Guide

This document details the production build, server configuration, security hardening, and deployment procedures for the **EcoBin Web Admin** application.

---

## 1. Overview & Build Artifacts

The EcoBin Web Admin is built as an Angular 19 Single Page Application (SPA).

### Production Build
```bash
npm run build -- --configuration=production
```
- **Output Directory:** `dist/ecobin-admin/browser/`
- **Output Hashing:** All chunks and stylesheets are hashed (`[name]-[hash].js`, `[name]-[hash].css`).
- **Source Maps:** Production source maps are disabled or generated as hidden source maps via `--configuration=production-sourcemaps` for internal monitoring/Sentry.
- **Budget Thresholds:**
  - Initial Bundle: Max warning `450 kB`, max error `600 kB`.
  - Component Styles: Max warning `6 kB`, max error `10 kB`.

---

## 2. Nginx Server Configuration

Below is a production-grade Nginx configuration demonstrating:
1. **SPA Fallback Routing:** All non-file routes return `/index.html`.
2. **Caching Strategy:**
   - `index.html`: `no-cache, no-store, must-revalidate` (ensures users immediately receive new application versions upon deployment).
   - Hashed static assets (`*.js`, `*.css`, fonts, images): `public, max-age=31536000, immutable`.
3. **Compression:** Gzip and Brotli compression enabled for modern browsers.
4. **API Reverse Proxy:** Reverse proxying `/api/` to the backend server with proxy buffering and timeouts.
5. **Security Headers:** Strict CSP, HSTS, X-Content-Type-Options, Referrer-Policy, and frame restrictions.

```nginx
# /etc/nginx/conf.d/ecobin-admin.conf

# Upstream Backend API Service
upstream ecobin_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name admin.ecobin.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.ecobin.com;

    # SSL / TLS Termination
    ssl_certificate /etc/letsencrypt/live/admin.ecobin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/admin.ecobin.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    root /var/www/ecobin-admin/browser;
    index index.html;

    # -------------------------------------------------------------
    # Compression (Gzip & Brotli)
    # -------------------------------------------------------------
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/x-javascript
        application/xml
        application/xml+rss
        image/svg+xml;

    # If Brotli module is installed (ngx_brotli):
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css application/json application/javascript image/svg+xml;

    # -------------------------------------------------------------
    # HTTP Security Headers
    # -------------------------------------------------------------
    # Content Security Policy (Google Maps & Angular compatible)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com; connect-src 'self' https: https://maps.googleapis.com https://*.googleapis.com; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # HTTP Strict Transport Security (HSTS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Prevent MIME sniffing
    add_header X-Content-Type-Options "nosniff" always;

    # Anti-clickjacking
    add_header X-Frame-Options "DENY" always;

    # Referrer Policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Permissions Policy
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # -------------------------------------------------------------
    # Static Assets & SPA Fallback
    # -------------------------------------------------------------

    # 1. Hashed JS/CSS and fonts -> Immutable caching (1 year)
    location ~* \.(?:css(\.map)?|js(\.map)?|woff2?|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # 2. Public static media / SVGs
    location ~* \.(?:ico|svg|png|jpg|jpeg|webp)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        access_log off;
    }

    # 3. index.html & health checks -> NEVER cache index.html
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # 4. SPA HTML5 PushState routing fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # -------------------------------------------------------------
    # Backend API Reverse Proxy (/api/)
    # -------------------------------------------------------------
    location /api/ {
        proxy_pass http://ecobin_backend;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts aligned with client timeoutInterceptor
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # Disable proxy buffering for streaming / large responses
        proxy_buffering off;
    }
}
```

---

## 3. Token Storage Trade-Off & Backend Recommendations

### Current Client-Side Architecture
- The SPA stores access tokens and refresh tokens in `sessionStorage` (or `localStorage`) via `TokenStorageService`.
- **Trade-off:** This provides maximum simplicity for decoupled SPAs without requiring complex cross-domain cookie coordination during initial development. However, tokens stored in `sessionStorage`/`localStorage` are susceptible to exfiltration if an Cross-Site Scripting (XSS) vulnerability exists.

### Recommended Target Architecture (Backend Migration)
For enhanced security in high-trust production environments, the backend team should transition token issuance to a hybrid scheme:
1. **Refresh Token as `httpOnly` Cookie:**
   - `POST /api/v1/auth/login` and `POST /api/v1/auth/refresh` should return the refresh token via a `Set-Cookie` header:
     ```http
     Set-Cookie: ecobin_refresh_token=...; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
     ```
   - Because `HttpOnly` is set, JavaScript cannot read the token, entirely eliminating refresh token theft via XSS.
   - `Path=/api/v1/auth` restricts transmission solely to authentication endpoints.
2. **Access Token In-Memory:**
   - The short-lived JWT access token (15-minute TTL) remains in memory in the Angular application state (or `sessionStorage` for page reloads).
3. **CORS Requirement:**
   - The backend API must permit credentials: `Access-Control-Allow-Credentials: true`.
   - `Access-Control-Allow-Origin` cannot be wildcard `*`; it must explicitly match `https://admin.ecobin.com`.

---

## 4. Continuous Integration & Verification

The project includes automated CI verification via GitHub Actions (`.github/workflows/ci.yml`) and local scripts:
- **Unit Tests:** `npm run test -- --watch=false`
- **Production Build:** `npm run build`
- **Secret Scanning Guard:** `node scripts/check-no-secrets.mjs` (scans all tracked repository files and `dist/` for Google API keys, blocking accidental leaks).
- **Mock Leak Validation:** `npm run check:prod-bundle` (scans generated bundles to verify no mock data or mock interceptors leak into production output).

---

## 5. Google Maps Production Configuration & Security

The EcoBin Web Admin uses `@angular/google-maps` to render IoT fleet distribution across Cairo and Alexandria. To maintain strict separation between development demo keys and production infrastructure, runtime configuration and production security boundaries are enforced as follows:

### 5.1 Runtime Configuration & Exclusion from Build Artifacts

1. **Decoupled Runtime Configuration:**
   - The application does not compile API keys into environment TypeScript files (`environment.ts` or `environment.production.ts`).
   - Instead, `AppConfigService` fetches `/config.json` at runtime only when a map route is activated.
   - Developers copy `public/config.example.json` to `public/config.json` and insert their demo key (`YOUR_KEY`).
2. **Production Asset Exclusion in `angular.json`:**
   - In `angular.json`, the production configuration overrides the asset globs to explicitly ignore `config.json`:
     ```json
     "configurations": {
       "production": {
         "assets": [
           {
             "glob": "**/*",
             "input": "public",
             "ignore": ["config.json"]
           }
         ]
       }
     }
     ```
   - This ensures that a developer's local `public/config.json` is **never copied** to `dist/ecobin-admin/browser/` during `ng build`.
3. **Production Deployment Delivery:**
   - In production environments (e.g. Kubernetes, Docker, Nginx), `config.json` is injected at deployment time as a mounted volume, environment template, or dedicated static file served at `/config.json`:
     ```json
     {
       "googleMaps": {
         "apiKey": "YOUR_KEY",
         "mapId": "PROD_MAP_ID",
         "version": "quarterly",
         "language": "en",
         "region": "EG"
       },
       "map": {
         "refreshSeconds": 30
       }
     }
     ```

### 5.2 Production Content Security Policy (CSP)

Google Maps JavaScript API requires specific external origins for bootstrapping, tile assets, vector data, fonts, and Web Workers. The production CSP directive is defined as:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://maps.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob: https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https: https://maps.googleapis.com https://*.googleapis.com;
  worker-src 'self' blob:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

#### Directive Breakdown
- `script-src`: Authorizes Google Maps bootstrap from `https://maps.googleapis.com`.
- `img-src`: Allows map tiles, marker pins, satellite imagery, and Street View previews from `https://maps.gstatic.com`, `https://*.googleapis.com`, and `https://*.ggpht.com`.
- `connect-src`: Permits API telemetry, geocoding requests, vector tile downloads, and viewport metadata via `https://maps.googleapis.com` and `https://*.googleapis.com`.
- `font-src`: Authorizes Roboto typography delivered from `https://fonts.gstatic.com`.
- `style-src`: Requires `'unsafe-inline'` and `https://fonts.googleapis.com` because Google Maps injects dynamic DOM styles for UI controls, street attribution, and copyright disclaimers.
- `worker-src`: Google Maps compiles worker threads on-the-fly for client-side vector tile rendering and geometry maths using `blob:` URLs.

### 5.3 Third-Party Script Threat Model & Safeguards

Loading any external JavaScript (`maps.googleapis.com`) introduces third-party script risks because external code executes in the same DOM origin:

1. **Credential Isolation:**
   - Google Maps scripts running in the page can theoretically inspect DOM contents and global JavaScript scope.
   - To prevent token theft, authentication tokens should be handled via `HttpOnly`, `SameSite=Strict` cookies (as detailed in Section 3), entirely inaccessible to JavaScript.
2. **Quota & Denial-of-Service Defense:**
   - A runaway component re-render or reactive loop could trigger dozens of Map instantiations, burning Google Cloud quota.
   - The frontend implements `MapLoadBudgetService`, restricting Map creations to 8 per tab session. Attempts beyond this quota are blocked and trigger an alert requiring a full page refresh.
3. **Restricted Domain Allowlist:**
   - CSP prevents scripts from calling unauthorized third-party domains or exfiltrating data outside Google Maps endpoints.
4. **Local CSP Validation:**
   - Developers can test the strict CSP locally without Nginx by running:
     ```bash
     ng serve --configuration=csp
     ```

