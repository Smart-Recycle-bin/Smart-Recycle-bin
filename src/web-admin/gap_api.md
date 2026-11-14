# EcoBin System Admin — API & Schema Gap Analysis (`gap_api.md`)

This document records all missing endpoints, schema/contract discrepancies, open questions, and UI inconsistencies identified while implementing the EcoBin System Admin frontend.
Derived from:
- `docs/APIs.md` (backend contract)
- `docs/schema.dbml` (database schema)
- `smart waste bins.pdf` (17 preliminary UI screens)
- `docs/frontend-scope.md` (single source of truth for frontend scope)

---

## 1. Missing Endpoints (PROPOSED)

All proposed endpoints follow the standard APIs.md envelope:
```json
{
  "success": true,
  "data": { ... }
}
```
Errors return:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable description"
  }
}
```

---

### 1.1 Authentication & Session

#### `POST /api/v1/auth/refresh`
- **Screen(s):** Shell (background session refresh)
- **Actor:** Public (no Bearer token)
- **Purpose:** Exchange a valid refresh token for a newly issued access token and rotated refresh token.
- **Request Body:**
  ```json
  {
    "refreshToken": "string"
  }
  ```
- **Response `data`:**
  ```json
  {
    "accessToken": "string",
    "expiresIn": 900,
    "refreshToken": "string"
  }
  ```
- **Errors:** `401 INVALID_REFRESH_TOKEN`, `403 ACCOUNT_SUSPENDED`, `400 VALIDATION_ERROR`.
- **Notes:** Single-use rotation: old token is invalidated immediately; reusing an already-used token revokes the entire family.

#### `POST /api/v1/auth/login` (Admin Support & Refresh Token)
- **Screen(s):** S1 Login (p1)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Authenticate system admin and establish session.
- **Request Body:**
  ```json
  {
    "email": "admin@ecobin.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response `data`:**
  ```json
  {
    "accessToken": "jwt_token_string",
    "expiresIn": 900,
    "refreshToken": "refresh_token_string",
    "user": {
      "userId": "usr_adm_01",
      "displayName": "Alex Morgan",
      "role": "SYS_ADMIN"
    }
  }
  ```
- **Notes:** APIs.md states `POST /auth/login` is for `USER_CITIZEN` / `OPS_COLLECTOR` and notes `SYS_ADMIN` does not use it. Frontend proposes enabling this endpoint for `SYS_ADMIN` and returning `refreshToken`.

#### `POST /api/v1/auth/logout` (Admin & Refresh Invalidation)
- **Screen(s):** Shell (Sign out)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Terminate session and invalidate refresh token.
- **Request Body:**
  ```json
  {
    "refreshToken": "refresh_token_string"
  }
  ```
- **Response `data`:**
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

### 1.2 Dashboard Analytics

#### `GET /api/v1/admin/analytics/overview`
- **Screen(s):** S2 Overview (p2, p17)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Fetch aggregated dashboard KPIs, time-series charts, fleet health, material volume share, and attention items for a given time window.
- **Query Parameters:** `period` (`today` | `7d` | `30d` | `custom`), `startDate` (ISO string, optional), `endDate` (ISO string, optional).
- **Response `data`:**
  ```json
  {
    "period": "7d",
    "kpis": {
      "dailyActiveUsers": { "value": 1420, "delta": 12.5, "deltaType": "percentage" },
      "pointsIssued": { "value": 45200, "delta": 8.3, "deltaType": "percentage" },
      "pointsRedeemed": { "value": 31800, "delta": -4.2, "deltaType": "percentage" },
      "contaminationRate": { "value": 4.8, "delta": -0.6, "deltaType": "percentage_points" },
      "binsNeedingService": { "value": 7, "delta": null, "deltaType": null },
      "pendingAiReviews": { "value": 14, "delta": null, "deltaType": null }
    },
    "pointsTrend": [
      { "date": "2026-11-01", "pointsIssued": 6200, "pointsRedeemed": 4100 }
    ],
    "fleetHealth": {
      "registeredTotal": 148,
      "available": 112,
      "approx80Full": 22,
      "needsServicing95": 9,
      "offline": 5
    },
    "materialVolumeShare": [
      { "material": "Plastic", "sharePercentage": 44.5, "totalTonnes": 18.2 },
      { "material": "Aluminum / Can", "sharePercentage": 31.0, "totalTonnes": 12.7 },
      { "material": "Paper / Carton", "sharePercentage": 24.5, "totalTonnes": 10.0 }
    ],
    "contaminationTrend": [
      { "date": "2026-11-01", "value": 5.4 }
    ],
    "dailyActiveUsersTrend": [
      { "date": "2026-11-01", "value": 1350 }
    ],
    "binsNeedingAttention": [
      { "binId": "bin_012", "name": "Smart Bin #12", "area": "Maadi Degla", "fillLevel": 96 }
    ],
    "pendingAiReviews": [
      {
        "reportId": "rep_001",
        "sessionId": "ses_991",
        "predictedType": "Plastic Bottle",
        "confidence": 0.62,
        "feedbackText": "User flagged: classified as Plastic Bottle but item was Aluminum Can"
      }
    ],
    "contaminationHotspots": [
      { "wasteCategory": "Hazardous / Batteries", "rejectionRate": 18.2 }
    ]
  }
  ```

---

### 1.3 Smart Bins & Map

#### `GET /api/v1/admin/bins`
- **Screen(s):** S3 Bins List (p3), S4 Live Bin Map (p4)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Retrieve list of all smart bins with operational status, location, fill level, and assigned collector.
- **Query Parameters:** `search` (string), `district` (string), `status` (`AVAILABLE` | `≥80% FULL` | `≥95% FULL / NEEDS SERVICING` | `offline`), `collectorId` (string), `region` (string).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "binId": "bin_001",
        "name": "Bin #01 - Square A",
        "area": "Zamalek 26th July",
        "district": "Zamalek",
        "region": "Greater Cairo",
        "fillLevel": 45,
        "status": "AVAILABLE",
        "collectorId": "col_101",
        "collectorName": "Tarek Mansour",
        "latitude": 30.0626,
        "longitude": 31.2197,
        "lastServicedAt": "2026-11-12T14:30:00Z"
      }
    ],
    "totalCount": 148,
    "districtCount": 12
  }
  ```

---

### 1.4 Recycler Moderation

#### `GET /api/v1/admin/recyclers`
- **Screen(s):** S5 Recyclers (p5)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Search and filter citizen recycler accounts for admin moderation.
- **Query Parameters:** `search` (string), `status` (`active` | `suspended` | `banned`).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "userId": "usr_cit_001",
        "name": "Farida Nader",
        "email": "farida.nader@gmail.com",
        "phone": "+201001234567",
        "availablePoints": 3450,
        "lifetimePoints": 12800,
        "totalSessions": 46,
        "status": "active",
        "joinedAt": "2026-03-15T09:00:00Z"
      }
    ],
    "totalCount": 2480
  }
  ```

---

### 1.5 Collectors Management

#### `GET /api/v1/admin/collectors`
- **Screen(s):** S6 Collectors (p6)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Search and list field collectors with assigned bins count and activity status.
- **Query Parameters:** `search` (string), `status` (`active` | `inactive`).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "collectorId": "col_101",
        "name": "Tarek Mansour",
        "email": "tarek.m@ecobin.com",
        "phone": "+201123456789",
        "district": "Zamalek",
        "assignedBinsCount": 8,
        "status": "active",
        "lastActiveAt": "2026-11-13T16:45:00Z"
      }
    ],
    "totalCount": 24
  }
  ```

#### `PUT /api/v1/admin/collectors/:collectorId`
- **Screen(s):** S6 Collectors (p6 - Edit Collector pencil icon)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Update collector contact information and assigned district.
- **Request Body:**
  ```json
  {
    "name": "Tarek Mansour",
    "email": "tarek.m@ecobin.com",
    "phone": "+201123456789",
    "district": "Zamalek"
  }
  ```
- **Response `data`:**
  ```json
  {
    "collectorId": "col_101",
    "name": "Tarek Mansour",
    "email": "tarek.m@ecobin.com",
    "phone": "+201123456789",
    "district": "Zamalek",
    "status": "active",
    "updatedAt": "2026-11-14T08:00:00Z"
  }
  ```

#### `POST /api/v1/admin/collectors/:collectorId/deactivate`
- **Screen(s):** S6 Collectors (p6 - Deactivate icon)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Deactivate a collector's account.
- **Request Body:** `{}`
- **Response `data`:**
  ```json
  {
    "collectorId": "col_101",
    "status": "inactive",
    "deactivatedAt": "2026-11-14T08:00:00Z"
  }
  ```

#### `GET /api/v1/admin/collectors/:collectorId/bins`
- **Screen(s):** S6 Collectors (p6 - View assigned bins eye icon)
- **Actor:** `SYS_ADMIN`
- **Purpose:** List bins currently assigned to a collector.
- **Response `data`:**
  ```json
  {
    "collectorId": "col_101",
    "bins": [
      {
        "binId": "bin_001",
        "name": "Bin #01 - Square A",
        "area": "Zamalek 26th July",
        "fillLevel": 45,
        "status": "AVAILABLE"
      }
    ]
  }
  ```

---

### 1.6 Inspection & AI Review Queue

#### `GET /api/v1/admin/inspections/summary`
- **Screen(s):** S8 Reports / AI review queue (p9)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Provide summary metrics for the retraining dataset and review queue.
- **Response `data`:**
  ```json
  {
    "labelledImagesCount": 3840,
    "nextScheduledRetrainThreshold": 5000,
    "pendingCount": 14,
    "reviewedCount": 320
  }
  ```

#### `GET /api/v1/admin/inspections`
- **Screen(s):** S8 Reports / AI review queue (p9)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Query inspection reports flagged for manual AI prediction review.
- **Query Parameters:** `status` (`Pending` | `Reviewed` | `Sent to Retraining`).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "reportId": "rep_001",
        "sessionId": "ses_991",
        "imageThumbnail": "https://storage.ecobin.com/frames/ses_991_thumb.jpg",
        "binId": "bin_012",
        "binName": "Smart Bin #12",
        "mlPredictedType": "Plastic Bottle",
        "mlConfidence": 0.62,
        "userFeedback": "Incorrect classification, aluminum can",
        "createdAt": "2026-11-13T10:15:00Z",
        "status": "Pending"
      }
    ],
    "totalCount": 14
  }
  ```

#### `GET /api/v1/admin/inspections/:reportId`
- **Screen(s):** S8 Report Detail (p10)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Fetch detailed report for an AI review, including 3 captured camera frames and per-class confidence breakdown.
- **Response `data`:**
  ```json
  {
    "reportId": "rep_001",
    "sessionId": "ses_991",
    "binId": "bin_012",
    "binName": "Smart Bin #12",
    "createdAt": "2026-11-13T10:15:00Z",
    "status": "Pending",
    "capturedFrames": [
      "https://storage.ecobin.com/frames/ses_991_f1.jpg",
      "https://storage.ecobin.com/frames/ses_991_f2.jpg",
      "https://storage.ecobin.com/frames/ses_991_f3.jpg"
    ],
    "userFeedback": {
      "userId": "usr_cit_001",
      "userName": "Farida Nader",
      "submittedAt": "2026-11-13T10:16:00Z",
      "comment": "Item was aluminum soda can, recognized as plastic bottle"
    },
    "mlInference": {
      "modelVersion": "v2.4.1",
      "predictedWasteType": "Plastic Bottle",
      "estimatedPoints": 15,
      "classConfidences": [
        { "category": "Plastic Bottle", "confidence": 0.62 },
        { "category": "Aluminum Can", "confidence": 0.35 },
        { "category": "Other", "confidence": 0.03 }
      ]
    }
  }
  ```

#### `POST /api/v1/admin/inspections/:reportId/correct`
- **Screen(s):** S8 Report Detail (p10)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Re-classify waste item category and update survey outcome.
- **Request Body:**
  ```json
  {
    "correctCategory": "Aluminum Can",
    "notes": "Verified from frame 2 that it is a beverage can"
  }
  ```
- **Response `data`:**
  ```json
  {
    "reportId": "rep_001",
    "status": "Reviewed",
    "appliedCategory": "Aluminum Can",
    "reviewedAt": "2026-11-14T08:30:00Z"
  }
  ```

#### `POST /api/v1/admin/inspections/:reportId/dismiss`
- **Screen(s):** S8 Report Detail (p10 - "ML was correct / dismiss")
- **Actor:** `SYS_ADMIN`
- **Purpose:** Dismiss user dispute and confirm ML inference was correct.
- **Request Body:** `{}`
- **Response `data`:**
  ```json
  {
    "reportId": "rep_001",
    "status": "Reviewed",
    "reviewedAt": "2026-11-14T08:30:00Z"
  }
  ```

#### `POST /api/v1/admin/inspections/:reportId/retrain`
- **Screen(s):** S8 Report Detail (p10 - "Send to retraining")
- **Actor:** `SYS_ADMIN`
- **Purpose:** Export images and corrected label to ML retraining pipeline.
- **Request Body:**
  ```json
  {
    "confirmedCategory": "Aluminum Can"
  }
  ```
- **Response `data`:**
  ```json
  {
    "reportId": "rep_001",
    "status": "Sent to Retraining",
    "reviewedAt": "2026-11-14T08:30:00Z"
  }
  ```

#### `GET /api/v1/admin/waste-types`
- **Screen(s):** S8 Report Detail (p10 category dropdown)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Provide valid waste type categories for admin re-classification.
- **Response `data`:**
  ```json
  {
    "items": [
      { "id": "wt_plastic", "name": "Plastic Bottle", "pointsPerUnit": 15 },
      { "id": "wt_aluminum", "name": "Aluminum Can", "pointsPerUnit": 25 },
      { "id": "wt_paper", "name": "Paper / Carton", "pointsPerUnit": 10 },
      { "id": "wt_glass", "name": "Glass Bottle", "pointsPerUnit": 20 }
    ]
  }
  ```

---

### 1.7 Survey QA

#### `GET /api/v1/admin/survey-qa`
- **Screen(s):** S9 Survey QA (p11)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Fetch survey QA metrics (confirm/reject split, trends, breakdown by bin and category) and recent survey records.
- **Query Parameters:** `dateRange` (string), `outcome` (`confirmed` | `rejected`).
- **Response `data`:**
  ```json
  {
    "kpis": {
      "totalSurveys14d": 12840,
      "confirmRate": 95.2,
      "confirmRateDelta": 1.4,
      "rejectRate": 4.8,
      "rejectRateDelta": -1.4,
      "flaggedToAiQueue": 14
    },
    "split": {
      "confirmed": 12224,
      "rejected": 616
    },
    "rejectionTrend": [
      { "date": "2026-11-01", "rejectionRate": 5.1 }
    ],
    "rejectionByBin": [
      { "binId": "bin_012", "binName": "Smart Bin #12", "rejectionRate": 9.4 }
    ],
    "rejectionByCategory": [
      { "category": "Hazardous / Batteries", "rejectionRate": 18.2 },
      { "category": "Aluminum Can", "rejectionRate": 6.1 }
    ],
    "recentSurveys": [
      {
        "sessionId": "ses_991",
        "userId": "usr_cit_001",
        "userName": "Farida Nader",
        "itemsSummary": "2x Plastic Bottles, 1x Can",
        "pointsAwarded": 55,
        "outcome": "rejected",
        "timestamp": "2026-11-13T10:15:00Z"
      }
    ]
  }
  ```

---

### 1.8 Wallet & Ledger Enriched

#### `GET /api/v1/admin/ledger`
- **Screen(s):** S7 Wallet & ledger (p8)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Search and filter immutable ledger entries with user and bin metadata.
- **Query Parameters:** `search` (string), `type` (`credit` | `debit`), `startDate` (ISO string), `endDate` (ISO string).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "transactionId": "tx_8801",
        "timestamp": "2026-11-13T14:22:00Z",
        "userId": "usr_cit_001",
        "userName": "Farida Nader",
        "binId": "bin_001",
        "binName": "Smart Bin #01",
        "itemsDetail": "3x Plastic Bottle (45 pts)",
        "pointsDelta": 45,
        "runningBalance": 3450,
        "entryType": "credit",
        "source": "session_confirm"
      }
    ],
    "totalCount": 8920
  }
  ```

---

### 1.9 Rewards Catalog Admin & Upload

#### `GET /api/v1/admin/rewards`
- **Screen(s):** S10 Rewards catalog (p12–p14)
- **Actor:** `SYS_ADMIN`
- **Purpose:** List rewards for admin management, including archived items and redemption statistics.
- **Query Parameters:** `status` (`in_stock` | `out_of_stock` | `archived`), `category` (string).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "rewardId": "rew_001",
        "title": "EGP 50 Metro Supermarket Voucher",
        "description": "Valid on all groceries",
        "category": "Groceries",
        "voucherCodeType": "qr",
        "pointsCost": 500,
        "inventoryStock": 85,
        "redeemedCount": 215,
        "status": "in_stock",
        "imageUrl": "https://storage.ecobin.com/rewards/metro50.png",
        "validFrom": "2026-01-01T00:00:00Z",
        "validUntil": "2026-12-31T23:59:59Z"
      }
    ],
    "totalCount": 24
  }
  ```

#### `POST /api/v1/admin/rewards/upload-image`
- **Screen(s):** S10 New-reward drawer (p13)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Upload reward voucher image asset to object storage.
- **Request:** `multipart/form-data` with `file`.
- **Response `data`:**
  ```json
  {
    "imageUrl": "https://storage.ecobin.com/rewards/uploaded_uuid.png"
  }
  ```

---

### 1.10 Leaderboards & Badges

#### `GET /api/v1/admin/leaderboard`
- **Screen(s):** S11 Leaderboards & badges (p15)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Retrieve citizen ranking by lifetime points and recycling volume in kg.
- **Query Parameters:** `scope` (`weekly` | `monthly` | `all-time`).
- **Response `data`:**
  ```json
  {
    "scope": "weekly",
    "items": [
      {
        "rank": 1,
        "userId": "usr_cit_042",
        "userName": "Ahmed Ezzat",
        "lifetimePoints": 14200,
        "recycledVolumeKg": 82.5
      }
    ]
  }
  ```

#### `GET /api/v1/admin/badges`
- **Screen(s):** S11 Leaderboards & badges (p15)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Retrieve milestone badges catalogue along with counts of how many users earned each badge.
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "badgeId": "bdg_01",
        "name": "Eco Starter",
        "description": "Completed first 5 recycling sessions",
        "thresholdText": "5 sessions",
        "earnedCount": 1840,
        "iconUrl": "https://storage.ecobin.com/badges/starter.svg"
      }
    ]
  }
  ```

---

### 1.11 Audit Logs

#### `GET /api/v1/admin/audit-logs`
- **Screen(s):** S12 Audit logs (p16)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Search and filter administrative audit log events.
- **Query Parameters:** `adminId` (string), `actionType` (string), `resourceId` (string), `startDate` (ISO string), `endDate` (ISO string).
- **Response `data`:**
  ```json
  {
    "items": [
      {
        "logId": "aud_7701",
        "timestamp": "2026-11-13T17:10:00Z",
        "adminId": "usr_adm_01",
        "adminName": "Alex Morgan",
        "actionType": "BIN_ASSIGN",
        "resourceId": "bin_001",
        "justification": "Reassigned bin to Tarek Mansour after district route update",
        "ipAddress": "197.38.14.22"
      }
    ],
    "totalCount": 1280
  }
  ```

---

### 1.12 Notifications

#### `GET /api/v1/admin/notifications`
- **Screen(s):** Shell (p-all topbar notifications panel)
- **Actor:** `SYS_ADMIN`
- **Purpose:** Retrieve recent admin notifications and unread count.
- **Response `data`:**
  ```json
  {
    "unreadCount": 9,
    "items": [
      {
        "id": "notif_01",
        "title": "Bin #12 Capacity Alert",
        "message": "Smart Bin #12 reached 96% capacity in Maadi Degla.",
        "time": "10m ago",
        "unread": true,
        "type": "warning"
      }
    ]
  }
  ```

#### `PATCH /api/v1/admin/notifications/:id/read`
- **Screen(s):** Shell notifications panel
- **Actor:** `SYS_ADMIN`
- **Purpose:** Mark an individual notification as read.
- **Request Body:** `{}`
- **Response `data`:**
  ```json
  {
    "id": "notif_01",
    "unread": false
  }
  ```

#### `POST /api/v1/admin/notifications/mark-all-read`
- **Screen(s):** Shell notifications panel ("Mark all as read")
- **Actor:** `SYS_ADMIN`
- **Purpose:** Mark all notifications for the current admin as read.
- **Request Body:** `{}`
- **Response `data`:**
  ```json
  {
    "unreadCount": 0
  }
  ```

---

## 2. Contract Discrepancies

| Item | `APIs.md` | `schema.dbml` | UI (`smart waste bins.pdf`) | Frontend Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Login** | `POST /auth/login` notes `SYS_ADMIN` does not use it. No `refreshToken` in response. | `users` table has `role` enum (`USER_CITIZEN`, `OPS_COLLECTOR`, `SYS_ADMIN`). | S1 Login (p1) is the admin login interface. | Use `POST /api/v1/auth/login` for `SYS_ADMIN`. Response enriched with `refreshToken`. Non-admin role is rejected client-side. |
| **Refresh Token Endpoint** | Absent in APIs.md. | No `refresh_tokens` table in schema. | Implied for session persistence. | PROPOSED `POST /api/v1/auth/refresh` public endpoint with single-use rotation. |
| **Bin Status Values** | `AVAILABLE`, `≥80% FULL`, `≥95% FULL / NEEDS SERVICING`. | `smart_bins.status` VARCHAR. | p4/p17 shows `Offline` status filter & count. | Union type: `AVAILABLE`, `≥80% FULL`, `≥95% FULL / NEEDS SERVICING`, `offline`. Wire values match exactly. |
| **Account Status Values** | `active`, `suspended` (`POST /admin/users/:userId/suspend`). | `users.status` VARCHAR. | p5/p6 shows `Active`, `Suspended`, `Banned`, `Inactive`. | Union type: `active`, `suspended`, `banned`, `inactive`. `banned` and `inactive` marked `// PROPOSED`. |
| **Collector Provisioning** | `POST /admin/collectors` takes `userId`, `district`. | `collectors` has `user_id`, `assigned_district`. | p7 drawer has full name, email, phone, credentials mode (`invite_link` \| `temporary_password`), district. | Model `CreateCollectorRequest` with credentials mode, optional temporary password, and contact info. |
| **Ledger Source / Type** | `session_confirm`, `voucher_redemption`. Type `credit`, `debit`. | `ledger_transactions` has `entry_type`, `source`. | p8 shows `Manual adjustment` in filter and column. | Union type: `session_confirm`, `voucher_redemption`, `manual_adjustment`. Labels: `Disposal credit`, `Redemption debit`, `Manual adjustment`. |
| **Reward Status** | `in_stock`, `out_of_stock`. | `rewards_catalog.status`. | p12/p14 shows `Active`, `Out of Stock`, `Archived`. | Union type: `in_stock`, `out_of_stock`, `archived`. Labels: `Active`, `Out of Stock`, `Archived`. |
| **Voucher Code Type** | Not modeled in APIs.md reward response. | `vouchers` table has `voucher_code`. | p12/p13 shows `Code`, `QR`, `Barcode`. | Modeled in reward catalog DTO/view-model as `VoucherCodeType` (`code`, `qr`, `barcode`). |
| **Audit Action Types** | Few raw actions in APIs.md. | `audit_logs.action` VARCHAR. | p16 shows 7 distinct labels (Bin Assignment, Fleet Update, etc.). | Modeled as `AuditActionType` enum with snake_case wire values and exact UI labels. |
| **Inspection Actions** | No admin inspection endpoints in APIs.md. | `inspection_reports` table exists. | p9/p10 shows Review Queue, Dismiss, Correct Category, Send to Retraining. | Modeled full set of admin inspection review endpoints and actions. |
| **Survey QA Data** | No QA aggregation endpoint in APIs.md. | `disposal_surveys` table exists. | p11 shows rich metrics, trends, breakdown by bin and category. | Modeled `SurveyQaSummary` view-model and proposed `GET /api/v1/admin/survey-qa`. |

---

## 3. Open Questions

1. **API Error Body Shape:** `APIs.md` does not specify a single canonical JSON error envelope.
   - *Current Assumption:* `{ success: false, error?: { code: string; message?: string }, code?: string, message?: string }`.
2. **Pagination Strategy:** `APIs.md` lacks pagination query parameters (`page`, `pageSize`, `limit`, `offset`) and pagination envelope metadata across all endpoints.
   - *Current Assumption:* All tables in frontend prototype use client-side pagination over full result sets.
3. **Refresh Token Storage & Schema:** `schema.dbml` has no `refresh_tokens` table.
   - *Recommendation:* Backend needs a `refresh_tokens` table storing `(id, user_id, token_hash, expires_at, revoked_at, replaced_by_token, created_at)`.
4. **Behavior Undefined in Preliminary UI (Section 4 of `frontend-scope.md`):**
   - *Global topbar search:* What entities does it query? (Left unbuilt; open question).
   - *Overview "Export" / Audit "Export CSV":* No CSV export schema or endpoint specified.
   - *Reports table row checkboxes:* Bulk review/dismiss actions are not defined.
   - *Account "Ban" action:* APIs.md only defines `POST /admin/users/:userId/suspend` and `unsuspend`. A permanent ban endpoint is missing.
   - *User profile settings:* Topbar user menu has "Profile settings" link, but no screen exists.
   - *Map popup "View details" button:* Does it navigate to bin detail or open a drawer?
   - *Recycler table eye icon:* Does it navigate to user profile or disposal history?
   - *Region Mapping:* How "Greater Cairo" vs "Alexandria" tabs map to backend districts is undefined.

---

## 4. UI Inconsistencies & Approximated Data

1. **Prototype State Switcher Tabs:** Screens p3, p5, p8 show tabs labeled "Live | Loading | Empty | Error". These are development prototype artifacts and are not modeled as domain state or enums.
2. **Notification Badge Count:** Every screen in the preliminary PDF mockup shows the red badge count fixed at "9". In implementation, this is bound to the mock dataset containing 9 unread notifications.
3. **Bin Fill Thresholds:** The system uses 80% and 95% full thresholds, but UI color chips and labels vary slightly across screens. Standardized to `AVAILABLE`, `≥80% FULL`, and `≥95% FULL / NEEDS SERVICING`.
4. **Collector Credential Modes:** S6/p7 introduces `invite_link` and `temporary_password`, which are not documented in `APIs.md`. Handled via `CollectorCredentialsMode` enum.
5. **Cross-Screen Entity Contradictions (Single Truth Principle):**
   - **Session `S-88190`:** On p9 (Reports table), `S-88190` represents a pending AI review in `BIN-0007` (Paper, 71% confidence). On p11 (Survey QA table), `S-88190` represents Mariam Adel's rejected survey (`1× Aluminium tray`). Each screen's mock dataset preserves the data as presented on that screen where the entity is the primary subject.
   - **Session `S-88142`:** On p9, `S-88142` is pending report `AIR-2046` in `BIN-0018` (Metal, 55% confidence). On p11, `S-88142` is Dina Samir's confirmed survey (`4× Glass bottle`). Preserved per screen context.
6. **Synthetic & Approximated Dataset Extensions:**
   - **Recyclers (14 total):** 8 rows visible on p5; 6 synthetic recyclers added (`U-10139`, `U-10118`, `U-10147`, `U-10155`, `U-10168`, `U-10180`) to satisfy "1–8 of 14". Exactly one user is Suspended (`U-10063`) and one Banned (`U-10095`).
   - **Bins Fleet (23 total):** 6 rows visible on p3; 17 additional bins added across 4 districts (Cairo, Giza, Qalyubia, Alexandria) to reach 23 bins. Geo-coordinates approximated using actual landmarks. Breakdown strictly matches p4 & p17:
     - Greater Cairo (16 bins): 10 Available, 3 ≥80% full, 3 ≥95% full, 0 Offline.
     - Alexandria (7 bins): 4 Available, 1 ≥80% full, 1 ≥95% full, 1 Offline.
     - Total Fleet: 14 Available, 4 ≥80% full, 4 ≥95% full (`BIN-0007`, `BIN-0038`, `BIN-0061`, `BIN-0084`), 1 Offline (`BIN-0095`).
   - **Collectors (6 total):** Transcribed directly from p6 (5 Active, 1 Inactive). Assigned bin counts (5, 3, 5, 4, 5, 0) total 22 bins, with the remaining 1 unassigned bin being Offline.
   - **Global Ledger (15 total):** 10 rows visible on p8; 5 synthetic rows added to satisfy "1–10 of 15". Truncated UUIDs from p8 completed (`7f3a23a0-4c1e-4c12-92e1-000000000001` ... `015`). Each ledger row's running balance equals the referenced user's available points in the recyclers dataset.
   - **Inspection Queue (8 total):** 8 rows transcribed from p9 (5 Pending, 2 Reviewed, 1 Sent to Retraining). Full detail view modeled for `AIR-2048` from p10; synthetic frames and inference breakdown provided for the other 7 reports. Retraining dataset metrics: 1,285 labelled images, 1,500 target threshold, 215 remaining.
   - **Survey QA (9 recent surveys):** 6 rows visible on p11; 3 synthetic rows added to satisfy "1–6 of 9". Aggregated metrics: 18,402 surveys, 92.6% confirm rate, 7.4% reject rate, 1,362 flagged to AI queue.
   - **Rewards Catalog (8 items):** Exactly matching p12 and p14 (`RWD-001` through `RWD-008`). Defaults set to valid from `2025-07-01` to `2025-12-31`.
   - **Leaderboards:** Weekly leaderboard contains 10 visible rows from p15 plus 2 synthetic rows to satisfy "1–10 of 12". Monthly and All-Time views synthesized, with All-Time points matching each user's lifetime points from the recyclers table. Milestone badge counts match p15 verbatim.
   - **Audit Trail (10 total):** 8 rows visible on p16; 2 synthetic rows added to satisfy "1–8 of 10". Admins strictly mapped to Laila Hamdy (`ADM-001`) and Amr Shawky (`ADM-002`).


---

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
| Assign Bin | `POST /admin/bins/:binId/assign` | `BIN_ASSIGN` | Collector name & bin ID |
| Adjust Points | `POST /admin/ledger/adjust` | `LEDGER_ADJUSTMENT` | Adjustment delta & reason note |
| Create Reward | `POST /admin/rewards` | `CATALOG_CHANGE` | Reward title & points cost |
| Update Reward | `PUT /admin/rewards/:rewardId` | `CATALOG_CHANGE` | Reward title |
| Archive Reward | `POST /admin/rewards/:rewardId/archive` | `CATALOG_CHANGE` | Archival status change |
