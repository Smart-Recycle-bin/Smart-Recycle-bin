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
    # Content Security Policy (Angular compatible)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

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
- **Mock Leak Validation:** `npm run check:prod-bundle` (scans generated bundles to verify no mock data or mock interceptors leak into production output).
