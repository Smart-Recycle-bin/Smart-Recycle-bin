# EcoBin System Admin — Frontend scope (single source of truth)

Sources: `docs/APIs.md` (backend contract), `docs/schema.dbml`, `docs/smart waste bins.pdf` (17 PRELIMINARY screens).
PDF map: p1 login · p2 overview · p3 bins list · p4 live bin map · p5 recyclers · p6 collectors · p7 create-collector drawer · p8 wallet & ledger · p9 reports (AI review queue) · p10 report detail · p11 survey QA · p12 rewards grid · p13 new-reward drawer · p14 rewards table · p15 leaderboards & badges · p16 audit logs · p17 dark overview.

## 1. The scope rule (read twice)

We build ONLY what the features in section 2 need. A type, enum, mock dataset, service method or fake-backend handler exists only if a feature below needs it — NOT because a DB table exists and NOT because APIs.md has an endpoint. In particular: no entity per DB table; nothing for citizen-only, collector-only or device-only endpoints; no models for sessions, disposal items, vouchers, wallets, service records, user badges or roles unless a feature below shows them. `PasswordHash` never appears in the frontend. If you think something outside this file is needed, do NOT build it: add it to "Open questions" in `gap_api.md`.
The UI is preliminary: ids are opaque strings (any format).

## 2. Features in scope

**Shell (all screens):** current admin chip (display name, role, initials) taken from the login response; user menu "Sign out" (the "Profile settings" item has no screen → out of scope); notifications bell with unread count (p-all shows 9) + panel items (id, title, message, time, unread, type) + mark one read + mark all read (the shared `notifications-panel` component already defines this shape); sidebar badge on "Reports" = number of pending AI reviews.
**S1 Login (p1):** email + password; errors: invalid credentials, suspended account, validation. "Forgot password?" link → request type + service method only (no reset screen → no reset types). Session: login, refresh, logout.
**S2 Overview (p2, p17):** period selector Today / 7d / 30d / Custom (from–to). Six KPI cards: daily active users, points issued, points redeemed, contamination rate (each with delta vs previous period; contamination delta in percentage points), bins needing service, pending AI reviews (value only). Line chart points issued vs redeemed per day. Fleet health (registered bins total + counts Available / ≥80% full / ≥95% full / Offline). Recycling volume by material (share %, total tonnes). Contamination-rate trend. Daily-active-users trend. Needs attention: bins ≥95% (id, name, area, fill %) and unreviewed AI reports (report id, predicted type, confidence, feedback text). Top contamination hotspots (rejection rate by waste category).
**S3 Bins list (p3):** header "N registered smart bins across M districts"; search; filters district / status / collector; columns bin id, name + area, district, fill level, status, collector (name), last serviced; sortable; client-side pagination; "Register bin" button (request/response from APIs.md; the form is not in the PDF).
**S4 Live bin map (p4):** same bin data + latitude/longitude; region tabs (Greater Cairo / Alexandria); status checkboxes with counts (Available, ≥80% full, ≥95% needs servicing, Offline); side list (id, area, fill %); marker popup (id, name, fill, status, collector, last serviced).
**S5 Recyclers (p5):** search by name / email / phone / id; status filter (Active, Suspended, Banned); columns user (name + id), email, available points, lifetime points, sessions, status, joined. Moderation: suspend and unsuspend (documented endpoints; the control is not drawn in the PDF but the page is "Moderate recycler accounts"). The eye icon has no screen.
**S6 Collectors (p6, p7):** search; columns collector (name + id + district), email, phone, assigned bins count, status (Active / Inactive), last active; row icons (meaning inferred from the icons, confirm in gap_api.md): view assigned bins (eye), edit (pencil), assign bins (truck), deactivate (ban icon). "Create Collector Account" drawer: full name, email, phone, credentials mode (invite link | temporary password), district.
**S7 Wallet & ledger (p8):** immutable-ledger notice; search by user name / id / bin; type filter; date range; columns transaction id, timestamp, user (name + id), bin, items/detail, points delta, balance, type (Disposal credit / Redemption debit / Manual adjustment); "Manual adjustment" button (request/response from APIs.md; the form is not in the PDF).
**S8 Reports / AI review queue (p9, p10):** retraining dataset card (labelled images, next scheduled retrain threshold), pending count, reviewed count, status filter; table: image thumbnail, session id + report id, bin, ML prediction + confidence, user feedback, date, status. Detail: 3 captured frames, user rejection feedback (user, date), ML inference output (model version, predicted waste type, estimated points, confidence per class), admin actions: set correct category (select + Apply), "ML was correct / dismiss", "Send to retraining". Needs a list of waste-type options for the select.
**S9 Survey QA (p11):** KPIs (surveys in 14d, confirm rate, reject rate each with delta pp, flagged to AI queue); confirm-vs-reject split; rejection-rate trend per day; rejection rate by bin (top 6); by waste category; recent surveys table (session, user, items summary, points, result Confirmed/Rejected), client pagination.
**S10 Rewards catalog (p12–p14):** status filter; items: title, category, voucher code type, points price, redeemed count, stock, status (Active / Out of Stock / Archived), image; actions edit and archive; "New item" drawer: title*, description, category, voucher code type, points price*, inventory stock limit* (0 ⇒ Out of Stock), valid from / until, image upload. Create / update / archive per APIs.md.
**S11 Leaderboards & badges (p15):** scope tabs weekly / monthly / all-time; rows rank, user, lifetime points, recycling volume (kg); client pagination; milestone badges (name, threshold text, earned count). Read-only.
**S12 Audit logs (p16):** filters admin, action type, resource id, date range; columns timestamp, admin (id + name), action, resource, justification, IP. Read-only.

## 3. Client-only (NO types, NO endpoints)

Theme toggle, sidebar collapse, rewards grid/table toggle, the "Live | Loading | Empty | Error" tabs on p3/p5/p8 (prototype state switcher), the "Prototype:" note on the login screen. (Note: table pagination is transitioning from client-only to server-side with additive backend contracts and backward compatibility, per gap_api.md §1.13).

## 4. Behaviour undefined in the PDF → "Open questions" in gap_api.md only (do not build)

Global topbar search; overview "Export"; audit "Export CSV"; reports-table row checkboxes (bulk actions); "Ban" action (APIs.md only has suspend); "Profile settings"; map popup "View details"; recycler eye icon; how "Greater Cairo" / "Alexandria" regions map to districts. Note: Server-side pagination (`page`, `pageSize`, `sortBy`, `sortDir`, `meta` envelope) and lightweight lookups (`districts`, `collectors`, `admins`) are specified in gap_api.md §1.13 as additive contracts with backward compatibility.

## 5. Domains and folders (singular, kebab-case, FIXED)

common · auth · user · collector · bin · inspection · survey · wallet · reward · gamification · notification · audit · analytics
Group by TOPIC, not by kind. Layers:

- models: `src/app/core/models/<domain>/` — files `*.enum.ts`, `*.dto.ts` (exactly an APIs.md request/response), `*.view-model.ts` (screen-shaped models for undocumented or enriched endpoints; header comment `// GAP: see gap_api.md → <entry>`), each domain has `index.ts`; `core/models/index.ts` re-exports all. If a domain has more than 8 files, split into `enums/`, `dto/`, `view-models/` subfolders with barrels.
- mock: `src/app/core/mock/data/<domain>/`, `src/app/core/mock/db/`
- services: `src/app/core/services/<domain>/` (+ `api/`, existing `theme/`, `toast/`, `user/`)
- interceptors: `src/app/core/interceptors/{auth,error,shared,mock-backend/{engine,handlers/<domain>}}/`
- guards: `src/app/core/guards/auth/`
  Inside `core/models`, import other domains by specific FILE (never the root barrel or a barrel of the same domain) to avoid cycles; outside it, import from `core/models`. A type never lives in two places.

## 6. Enums (only these; `as const` object + derived union type + `<NAME>_LABELS` map; no TS `enum`)

ApiErrorCode (only codes APIs.md lists for in-scope endpoints + UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, CONFLICT + PROPOSED INVALID_REFRESH_TOKEN) · UserRole (USER_CITIZEN, OPS_COLLECTOR, SYS_ADMIN) · AccountStatus (active, suspended from API; banned, inactive from UI) · BinStatus (the 3 API values + Offline from UI) · LedgerEntryType (credit, debit) · LedgerSource (session_confirm, voucher_redemption from API + manual_adjustment from UI; labels Disposal credit / Redemption debit / Manual adjustment) · RewardStatus (in_stock, out_of_stock, archived; labels Active / Out of Stock / Archived) · RewardCategory (Groceries, Food delivery, Telecom, Entertainment, Eco goods, Charity, Transport, Education) · VoucherCodeType (Code, QR, Barcode) · InspectionReportStatus (Pending, Reviewed, Sent to Retraining) · SurveyOutcome (confirmed, rejected) · LeaderboardScope (weekly, monthly, all-time) · AuditActionType (Bin Assignment, Fleet Update, Ledger Adjustment, User Suspension, Catalog Change, Collector Provisioning, User Ban) · AnalyticsPeriod (today, 7d, 30d, custom) · CollectorCredentialsMode (invite_link, temporary_password) · NotificationType (info, success, warning, danger — identical to the shared component's type).
Wire values: from APIs.md where it defines them; UI-only values get a snake_case wire value marked `// PROPOSED` and logged in gap_api.md. No enum for waste types or districts (they are data: plain strings). No enums for the prototype state tabs.

## 7. Auth contract

- Admin logs in through the SAME `POST /auth/login` as other roles (APIs.md says SYS_ADMIN doesn't use it — log this as a discrepancy). After login, a role other than SYS_ADMIN is rejected client-side and nothing is stored.
- Refresh (PROPOSED, log in gap_api.md): `POST /api/v1/auth/refresh`, public (no Bearer). Request `{ refreshToken }`. Response `{ success: true, data: { accessToken, expiresIn, refreshToken } }`. Rotation: each refresh returns a NEW refresh token and invalidates the old (single-use); reusing an already-used token revokes the whole token family (server behaviour). Errors: 401 INVALID_REFRESH_TOKEN (unknown / expired / revoked / reused), 403 ACCOUNT_SUSPENDED, 400 VALIDATION_ERROR.
- `POST /auth/login` response also returns `refreshToken` (PROPOSED change to APIs.md; log it). `POST /auth/logout` takes an optional `{ refreshToken }` to revoke it (SYS_ADMIN is not listed as an actor in APIs.md; log it).
- schema.dbml has no refresh-token table → log it (backend needs token hash, user, expiresAt, revokedAt, replacedByToken, createdAt).
- Storage: `localStorage` behind a `TokenStorageService` abstraction (swappable). No httpOnly-cookie variant for now.

## 8. Global rules

1. Do NOT invent facts. Anything not in APIs.md / schema / PDF / this file: mark `// TODO(gap)` and add it to `gap_api.md`.
2. Wire (JSON) names follow APIs.md. What a screen shows that APIs.md lacks is added to the model (optional when sensible) and logged under "Contract discrepancies". For a documented endpoint whose response is poorer than the screen needs, the service returns the enriched view-model and gap_api.md gets an "Enriched endpoint" entry listing the added fields.
3. `gap_api.md` (repo root; created by Prompt 1, appended by the others) has 4 sections: (1) Missing endpoints (PROPOSED) — each entry: `METHOD /path`, screen(s), actor, purpose, request, response `data`, notes, in APIs.md style (`/api/v1`, `{ success, data }`), derived ONLY from the screens + schema; (2) Contract discrepancies — table: item | APIs.md | schema | UI | frontend decision; (3) Open questions (include: error body shape is unspecified, pagination absent in APIs.md → client-side, token refresh/storage, section 4 items); (4) UI inconsistencies and approximated data.
4. Code: Angular 22 standalone, signals, OnPush, `inject()`; strict TS (`noPropertyAccessFromIndexSignature` → bracket access, `noImplicitOverride`, `noImplicitReturns`, `isolatedModules`); never `any`; vitest specs next to source; no new npm dependencies; do not edit `src/app/shared/**`.
5. Every folder exporting more than one file has an `index.ts` barrel.
6. Finish with `ng build` and `ng test` green, then a final report (files created/changed, gaps added, anything skipped and why).
