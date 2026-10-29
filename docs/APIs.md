## 2. Module 1 — Authentication & Identity Management (AUTH / IAM)

### 2.1 Register Recycler

**Use Case:** A new citizen creates a Recycler account.

**Endpoint:** `POST /api/v1/auth/register`

**Actor:** `Public`
**Auth Required:** No
**FR Reference:** `AUTH-001`

**Description:**
Allows a new Recycler to self-register using email and password only. Third-party OAuth (Google/Apple) is explicitly excluded per `AUTH-001`. The email must be unique across the system. On success, a new `USER_CITIZEN` account is created with an initial wallet balance of 0 (`Available Points` = 0, `Lifetime Earned Points` = 0).

> **Assumption:** Registration does **not** auto-issue a JWT. The client must call `POST /auth/login` separately afterward.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "StrongP@ss123",
  "displayName": "Ahmed Mostafa"
}
```

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "userId": "b3f1...",
    "email": "user@example.com",
    "displayName": "Ahmed Mostafa",
    "role": "USER_CITIZEN",
    "createdAt": "2026-09-24T10:00:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |
| 400 | `VALIDATION_ERROR` | Weak password / invalid email format / missing fields |

---

### 2.2 Login (Shared Recycler / Collector)

**Use Case:** Any authenticated actor (Recycler or Collector) logs into the shared mobile app.

**Endpoint:** `POST /api/v1/auth/login`

**Actor:** `USER_CITIZEN`, `OPS_COLLECTOR`
**Auth Required:** No
**FR Reference:** `AUTH-003`, `AUTH-004`, `AUTH-005`

**Description:**
Single unified login endpoint used by both Recyclers and Collectors (`AUTH-003`). Credentials are validated, and on success a JWT is issued containing the user's `id`, `role`, and permission scope (`AUTH-004`). The mobile app uses the `role` claim to route the user to the correct dashboard (`AUTH-005`). `SYS_ADMIN` accounts do **not** use this endpoint (Web Admin Dashboard only, per Roles matrix — "Shared Mobile Application Login: No" for Admin).

**Request:**

```json
{
  "email": "user@example.com",
  "password": "StrongP@ss123"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 3600,
    "user": {
      "userId": "b3f1...",
      "displayName": "Ahmed Mostafa",
      "role": "USER_CITIZEN"
    }
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 403 | `ACCOUNT_SUSPENDED` | Account has been banned/suspended by Admin (`IAM-002`) |
| 400 | `VALIDATION_ERROR` | Missing fields |

---

### 2.3 Logout

**Use Case:** A logged-in user ends their session on the current device.

**Endpoint:** `POST /api/v1/auth/logout`

**Actor:** `USER_CITIZEN`, `OPS_COLLECTOR`
**Auth Required:** Yes

**Description:**
Invalidates the current access token/session on the server side (or, if tokens are stateless, instructs the client to discard it — depends on backend token strategy).

> **Assumption:** This endpoint was not in the FRD; added per your request. Since JWTs are typically stateless, this assumes a server-side token blocklist/session table exists. If tokens are pure stateless JWT with no server-side tracking, this endpoint becomes a client-only action (discard token) and this route may not be needed — flag if that's the case.

**Request:**
_No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

### 2.4 Forgot Password

**Use Case:** A user requests a password-reset email after forgetting their password.

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Actor:** `Public`
**Auth Required:** No
**FR Reference:** `AUTH-006`

**Description:**
Sends a time-limited reset token to the user's registered email if the account exists. Always returns success (even if the email doesn't exist) to avoid leaking which emails are registered.

**Request:**

```json
{ "email": "user@example.com" }
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": { "message": "If this email exists, a reset link has been sent." }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid email format |

---

### 2.5 Reset Password

**Use Case:** A user sets a new password using the token received by email.

**Endpoint:** `POST /api/v1/auth/reset-password`

**Actor:** `Public`
**Auth Required:** No (token-based, not JWT)
**FR Reference:** `AUTH-006`

**Description:**
Completes the password-recovery flow. Validates the reset token (expiry + single-use), then updates the stored password hash.

**Request:**

```json
{
  "resetToken": "8f2c...",
  "newPassword": "NewStrongP@ss1"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Password updated successfully" }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 400 | `INVALID_OR_EXPIRED_TOKEN` | Token invalid, expired, or already used |
| 400 | `VALIDATION_ERROR` | Weak new password |

---

### 2.6 Change Password

**Use Case:** A logged-in user changes their password from their profile.

**Endpoint:** `PUT /api/v1/auth/password`

**Actor:** `USER_CITIZEN`, `OPS_COLLECTOR`, `SYS_ADMIN`
**Auth Required:** Yes
**FR Reference:** `AUTH-006`

**Description:**
Allows an authenticated user to change their password by providing their current password for verification, plus the new one.

**Request:**

```json
{
  "currentPassword": "StrongP@ss123",
  "newPassword": "EvenStrongerP@ss1"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `INVALID_CURRENT_PASSWORD` | Current password is wrong |
| 400 | `VALIDATION_ERROR` | Weak new password |

---

### 2.7 Create Collector Account (Admin)

**Use Case:** An Admin provisions a new Collector account.

**Endpoint:** `POST /api/v1/admin/collectors`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `AUTH-002`, `FR-RULE-002`

**Description:**
The **sole** way `OPS_COLLECTOR` accounts are created — Collectors cannot self-register (`AUTH-002`). Admin provides the Collector's identity and initial credentials. This action MUST be recorded in the immutable audit log (`FLT-003`).

**Request:**

```json
{
  "email": "collector1@company.com",
  "displayName": "Mostafa Ali",
  "temporaryPassword": "TempP@ss123",
  "phoneNumber": "+201234567890"
}
```

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "userId": "c7d2...",
    "email": "collector1@company.com",
    "displayName": "Mostafa Ali",
    "role": "OPS_COLLECTOR",
    "createdAt": "2026-09-24T10:00:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 400 | `VALIDATION_ERROR` | Missing/invalid fields |

---

### 2.8 Get My Profile

**Use Case:** A logged-in user views their own profile.

**Endpoint:** `GET /api/v1/profile`

**Actor:** `USER_CITIZEN`, `OPS_COLLECTOR`, `SYS_ADMIN`
**Auth Required:** Yes
**FR Reference:** `PROFILE-001`

**Description:**
Returns the authenticated user's own profile. Self-scoped only (`userId == currentUser.id`) — there is no admin variant that fetches another user's full profile via this route (Admin uses `2.11 Search Users` instead).

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "b3f1...",
    "email": "user@example.com",
    "displayName": "Ahmed Mostafa",
    "phoneNumber": "+201234567890",
    "profilePhotoUrl": "https://cdn.../photo.jpg",
    "role": "USER_CITIZEN"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

### 2.9 Update My Profile

**Use Case:** A logged-in user edits their own profile fields.

**Endpoint:** `PUT /api/v1/profile`

**Actor:** `USER_CITIZEN`, `OPS_COLLECTOR`, `SYS_ADMIN`
**Auth Required:** Yes
**FR Reference:** `PROFILE-001`

**Description:**
Updates only the editable fields defined in `PROFILE-001`: display name, phone number, profile photo. Email and role are never editable through this endpoint.

**Request:**

```json
{
  "displayName": "Ahmed M. Hassan",
  "phoneNumber": "+201112223334",
  "profilePhotoUrl": "https://cdn.../new-photo.jpg"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "b3f1...",
    "displayName": "Ahmed M. Hassan",
    "phoneNumber": "+201112223334",
    "profilePhotoUrl": "https://cdn.../new-photo.jpg"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid phone format / photo URL |

---

### 2.10 Request Account Deletion

**Use Case:** A Recycler requests to delete their account.

**Endpoint:** `POST /api/v1/account/deletion-request`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes (`USER_CITIZEN` only)
**FR Reference:** `IAM-001`

**Description:**
Initiates account deletion. Per `IAM-001`, the system does **not** hard-delete the user — it anonymizes user-identifying data in historical transactions and ledgers while preserving the financial/operational records. Only Recyclers can self-request this (Collectors/Admins have no such capability per the Roles matrix).

**Request:**

```json
{ "confirmationText": "DELETE" }
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "message": "Account deletion has been scheduled. Your data will be anonymized."
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `USER_CITIZEN` |
| 400 | `VALIDATION_ERROR` | Confirmation text mismatch |

---

### 2.11 Search Users (Admin)

**Use Case:** An Admin searches/browses all registered users.

**Endpoint:** `GET /api/v1/admin/users`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `IAM-002`

**Description:**
Allows the Admin to search all registered accounts (Recyclers and Collectors) for moderation purposes — e.g., ahead of inspecting disposal logs or suspending an account.

**Request (query params):**

```
GET /api/v1/admin/users?query=ahmed&role=USER_CITIZEN&status=active
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "userId": "b3f1...",
      "email": "user@example.com",
      "displayName": "Ahmed Mostafa",
      "role": "USER_CITIZEN",
      "status": "active",
      "createdAt": "2026-01-10T10:00:00Z"
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |

---

### 2.12 Get User Disposal Logs (Admin)

**Use Case:** An Admin inspects a specific user's disposal history while investigating fraud.

**Endpoint:** `GET /api/v1/admin/users/{userId}/disposal-logs`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `IAM-002`

**Description:**
Returns the target user's full disposal session history (sessions, items, survey outcomes), used as part of the fraud-investigation workflow before a suspend/ban decision.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "sessionId": "s-9021...",
      "binId": "bin-045",
      "startedAt": "2026-09-20T08:12:00Z",
      "itemsCount": 3,
      "surveyOutcome": "confirmed",
      "pointsAwarded": 45
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `userId` does not exist |

---

### 2.13 Suspend / Ban User (Admin)

**Use Case:** An Admin suspends or bans an account for fraudulent behavior.

**Endpoint:** `POST /api/v1/admin/users/{userId}/suspend`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `IAM-002`, `FLT-003`

**Description:**
Blocks the target account from claiming points or redeeming vouchers (`IAM-002`). Requires a justification reason, which is written to the immutable audit log (`FLT-003`), consistent with the mandatory-reason pattern used for `WLET-003` adjustments.

**Request:**

```json
{
  "reason": "Repeated fraudulent survey confirmations detected across 5 sessions"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "b3f1...",
    "status": "suspended",
    "suspendedAt": "2026-09-24T10:00:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `userId` does not exist |
| 400 | `VALIDATION_ERROR` | Empty/missing reason |
| 409 | `CONFLICT` | User already suspended |

---

### 2.14 Unsuspend / Unban User (Admin)

**Use Case:** An Admin reinstates a previously suspended/banned account.

**Endpoint:** `POST /api/v1/admin/users/{userId}/unsuspend`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)

> **Assumption:** Not explicit in the FRD — added per your request. Mirrors `2.13` and is also subject to mandatory audit logging (`FLT-003`) and a justification reason, for symmetry with the suspend action.

**Request:**

```json
{
  "reason": "Appeal reviewed — false positive, account reinstated"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "userId": "b3f1...",
    "status": "active",
    "unsuspendedAt": "2026-09-24T10:00:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `userId` does not exist |
| 400 | `VALIDATION_ERROR` | Empty/missing reason |
| 409 | `CONFLICT` | User is not currently suspended |

---

## 3. Module 2 — QR Scanning & Disposal Cycle (TRX / AIE)

### 3.1 Start Disposal Session (Scan QR)

**Use Case:** A Recycler scans a bin's QR code to start disposing of waste.

**Endpoint:** `POST /api/v1/bins/{binId}/sessions`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes (`USER_CITIZEN` only)
**FR Reference:** `TRX-001`, `TRX-002`, `FR-RULE-004`

**Description:**
Initiates a disposal session on the scanned bin. On success, the bin lid unlocks and a 60-second disposal window starts server-side (`TRX-002`). Per `FR-RULE-004`, a bin cannot host two active sessions in parallel: if another session is already active on this bin, that session is force-terminated (routing its owner to their survey) and a new session opens for the scanning user (`TRX-004` condition 2).

**Request:**

```json
{
  "qrPayload": "bin-045:dyn-8f2c91a0"
}
```

`qrPayload` is the raw string encoded in the bin's dynamic or static QR code.

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s-9021...",
    "binId": "bin-045",
    "status": "active",
    "windowExpiresAt": "2026-09-24T10:01:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 404 | `BIN_NOT_FOUND` | QR payload doesn't match any registered bin |
| 409 | `BIN_UNSERVICEABLE` | Bin is `≥95% FULL / NEEDS SERVICING` and cannot accept new sessions |
| 403 | `ACCOUNT_SUSPENDED` | User is suspended/banned |

---

### 3.2 Submit Detected Item (Device)

**Use Case:** The smart bin's embedded camera detects a thrown item, and the backend classifies it.

**Endpoint:** `POST /api/v1/sessions/{sessionId}/items`

**Actor:** `Device` (the bin hardware, not a mobile/web client)
**Auth Required:** Yes — device-level credential (not a user JWT)
**FR Reference:** `AIE-001`, `TRX-003`

**Description:**
Called by the bin's onboard system, not by the Recycler's phone. The bin hardware captures an image of the thrown item and uploads it here. The backend forwards the image to the ML.NET classification engine, which returns the `WasteType` and an estimated base point value (`AIE-001`). The item is appended to the active session, and — per `TRX-003` — this call **resets the 60-second window timer**, extending `windowExpiresAt`. Rejected if the session is not currently `active` (e.g., already expired or terminated).

> **Assumption:** Authenticated via a per-device credential/API key rather than a user JWT, since the caller is hardware, not a logged-in person. The exact device-auth mechanism (mTLS, device API key, etc.) is a backend/infra decision outside this document's scope.

**Request:** `multipart/form-data`

```
image: <binary JPEG/PNG>
capturedAt: 2026-09-24T10:00:32Z
```

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "itemId": "i-01",
    "sessionId": "s-9021...",
    "wasteType": "PLASTIC_BOTTLE",
    "confidenceScore": 0.94,
    "estimatedPoints": 15,
    "windowExpiresAt": "2026-09-24T10:01:32Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 404 | `SESSION_NOT_FOUND` | `sessionId` doesn't exist |
| 409 | `SESSION_NOT_ACTIVE` | Session already expired/terminated |
| 400 | `CLASSIFICATION_FAILED` | ML model could not produce a confident classification |
| 401 | `UNAUTHORIZED` | Invalid/missing device credential |

---

### 3.3 Get Session Status

**Use Case:** The Recycler's app displays the live countdown timer and items detected so far during an active session.

**Endpoint:** `GET /api/v1/sessions/{sessionId}`

**Actor:** `USER_CITIZEN` (session owner only)
**Auth Required:** Yes
**FR Reference:** Supports `TRX-002`, `TRX-003` (not an explicit FRD endpoint)

**Description:**
Returns the current state of a disposal session — remaining time and items detected so far — so the mobile UI can render the live countdown and running item list during the 60-second window.

> **Assumption:** Not in the FRD. Documented here as a simple polling endpoint. If the real-time UI is instead driven by a push mechanism (WebSocket/SignalR), this REST endpoint may be unnecessary or reduced to a one-time fetch — flag if that's the intended architecture.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s-9021...",
    "binId": "bin-045",
    "status": "active",
    "windowExpiresAt": "2026-09-24T10:01:32Z",
    "items": [
      { "itemId": "i-01", "wasteType": "PLASTIC_BOTTLE", "estimatedPoints": 15 }
    ]
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller does not own this session |
| 404 | `NOT_FOUND` | `sessionId` doesn't exist |

---

### 3.4 End Session Manually

**Use Case:** The Recycler taps an "End Session" button to finish disposing early.

**Endpoint:** `POST /api/v1/sessions/{sessionId}/end`

**Actor:** `USER_CITIZEN` (session owner only)
**Auth Required:** Yes
**FR Reference:** `TRX-004` (third termination condition — implied but not spelled out in the FRD text)

**Description:**
Terminates the active session immediately at the user's request, locks the bin lid, and transitions the session to the post-disposal survey (`SURV-001`) — same downstream flow as a timeout or concurrent-scan termination.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s-9021...",
    "status": "terminated",
    "terminationReason": "manual"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller does not own this session |
| 409 | `SESSION_NOT_ACTIVE` | Session already terminated |

---

## 4. Module 3 — Post-Disposal Survey & Point Awarding (SURV)

### 4.1 Get Session Survey

**Use Case:** After session termination, the Recycler is shown a summary of what they disposed of.

**Endpoint:** `GET /api/v1/sessions/{sessionId}/survey`

**Actor:** `USER_CITIZEN` (session owner only)
**Auth Required:** Yes
**FR Reference:** `SURV-001`

**Description:**
Immediately after any termination condition (timeout, concurrent scan, or manual end), the mobile app fetches this summary: detected items, their classified categories, and total calculated points — before the user confirms or rejects it.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s-9021...",
    "status": "pending_survey",
    "items": [
      {
        "itemId": "i-01",
        "wasteType": "PLASTIC_BOTTLE",
        "estimatedPoints": 15
      },
      { "itemId": "i-02", "wasteType": "ALUMINUM_CAN", "estimatedPoints": 10 }
    ],
    "totalPoints": 25
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller does not own this session |
| 404 | `NOT_FOUND` | `sessionId` doesn't exist |
| 409 | `SURVEY_ALREADY_RESOLVED` | Survey was already confirmed or rejected |

---

### 4.2 Confirm Survey

**Use Case:** The Recycler confirms the survey summary is accurate and claims their points.

**Endpoint:** `POST /api/v1/sessions/{sessionId}/survey/confirm`

**Actor:** `USER_CITIZEN` (session owner only)
**Auth Required:** Yes
**FR Reference:** `SURV-002`, `FR-RULE-003`

**Description:**
Executes an atomic (ACID) transaction that immediately credits the session's calculated points to the user's `Available Points` and `Lifetime Earned Points`, and appends a corresponding entry to the append-only ledger (`WLET-001`).

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s-9021...",
    "status": "confirmed",
    "pointsAwarded": 25,
    "newAvailablePoints": 340,
    "newLifetimePoints": 1250
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller does not own this session |
| 409 | `SURVEY_ALREADY_RESOLVED` | Already confirmed/rejected |

---

### 4.3 Reject Survey

**Use Case:** The Recycler disputes the survey summary (e.g., wrong classification).

**Endpoint:** `POST /api/v1/sessions/{sessionId}/survey/reject`

**Actor:** `USER_CITIZEN` (session owner only)
**Auth Required:** Yes
**FR Reference:** `SURV-003`

**Description:**
Awards **0 points** for the session. The system automatically generates a flagged inspection report — containing the captured images, ML inference outputs, and the user's rejection feedback — and routes it to the Admin Review Queue for the AI Active Learning Pipeline (`SURV-003`).

**Request:**

```json
{
  "feedback": "Item was glass, not plastic — misclassified"
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessionId": "s-9021...",
    "status": "rejected",
    "pointsAwarded": 0,
    "flaggedReportId": "fr-3391..."
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller does not own this session |
| 409 | `SURVEY_ALREADY_RESOLVED` | Already confirmed/rejected |

---

## 5. Module 4 — Wallet, Financial Ledger & Gamification (WLET)

### 5.1 Get Wallet Balance

**Use Case:** A Recycler checks their current points balance.

**Endpoint:** `GET /api/v1/wallet/balance`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes
**FR Reference:** `WLET-002`

**Description:**
Returns the caller's dual-bucket balance: `Available Points` (redeemable now) and `Lifetime Earned Points` (historical total, used for leaderboards/badges).

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "availablePoints": 340,
    "lifetimeEarnedPoints": 1250
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

### 5.2 Get My Ledger

**Use Case:** A Recycler reviews their personal transaction history.

**Endpoint:** `GET /api/v1/wallet/ledger`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes
**FR Reference:** `WLET-001`

**Description:**
Returns the caller's own entries from the immutable, append-only financial ledger — each entry includes the transaction UUID, timestamp, bin identifier (if applicable), item breakdown, points delta, and running balance snapshot.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "transactionId": "t-771...",
      "timestamp": "2026-09-24T10:02:00Z",
      "binId": "bin-045",
      "type": "credit",
      "pointsDelta": 25,
      "balanceAfter": 340,
      "source": "session_confirm",
      "sourceId": "s-9021..."
    },
    {
      "transactionId": "t-770...",
      "timestamp": "2026-09-20T14:15:00Z",
      "binId": null,
      "type": "debit",
      "pointsDelta": -100,
      "balanceAfter": 315,
      "source": "voucher_redemption",
      "sourceId": "rd-552..."
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

### 5.3 Get Global Ledger (Admin)

**Use Case:** An Admin inspects the financial ledger across all users.

**Endpoint:** `GET /api/v1/admin/ledger`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `WLET-001`

**Description:**
Same ledger structure as `5.2`, but scoped globally across all users, filterable by user/date/type — used for auditing and financial oversight.

**Request (query params):**

```
GET /api/v1/admin/ledger?userId=b3f1...&from=2026-09-01&to=2026-09-24&type=debit
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "transactionId": "t-771...",
      "userId": "b3f1...",
      "timestamp": "2026-09-24T10:02:00Z",
      "type": "credit",
      "pointsDelta": 25,
      "balanceAfter": 340,
      "source": "session_confirm"
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |

---

### 5.4 Manual Ledger Adjustment (Admin)

**Use Case:** An Admin manually credits or debits a user's points balance.

**Endpoint:** `POST /api/v1/admin/ledger/adjustments`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `WLET-003`, `FR-RULE-003`, `FLT-003`

**Description:**
Performs a manual credit or debit outside the normal disposal/redemption flows. Requires a **non-empty justification reason code**, without which the request is rejected (`WLET-003`, `ROLE-009`). Executes atomically (`FR-RULE-003`) and is written to both the append-only ledger and the immutable admin audit log (`FLT-003`).

**Request:**

```json
{
  "userId": "b3f1...",
  "amount": 50,
  "type": "credit",
  "reasonCode": "CUSTOMER_SUPPORT_GOODWILL",
  "reasonNote": "Compensation for app bug that dropped a confirmed session's points"
}
```

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "transactionId": "t-902...",
    "userId": "b3f1...",
    "pointsDelta": 50,
    "balanceAfter": 390
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 400 | `VALIDATION_ERROR` | Missing/empty `reasonCode`, or `amount` invalid |
| 404 | `NOT_FOUND` | `userId` does not exist |
| 409 | `INSUFFICIENT_BALANCE` | Debit amount exceeds user's `Available Points` |

---

### 5.5 Get Leaderboard

**Use Case:** A user views the platform's recycling leaderboard.

**Endpoint:** `GET /api/v1/leaderboard`

**Actor:** `USER_CITIZEN`, `SYS_ADMIN`
**Auth Required:** Yes
**FR Reference:** `WLET-004`

**Description:**
Returns ranked users based on `Lifetime Earned Points`, for the requested time scope: `weekly`, `monthly`, or `all-time`.

**Request (query params):**

```
GET /api/v1/leaderboard?scope=monthly
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "scope": "monthly",
    "rankings": [
      {
        "rank": 1,
        "userId": "u-11...",
        "displayName": "Sara K.",
        "points": 2100
      },
      {
        "rank": 2,
        "userId": "u-22...",
        "displayName": "Omar T.",
        "points": 1875
      }
    ]
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `scope` value |

---

### 5.6 Get My Achievements / Badges

**Use Case:** A Recycler views the milestone badges they've earned.

**Endpoint:** `GET /api/v1/achievements`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes
**FR Reference:** `WLET-004`

**Description:**
Returns the badges the caller has unlocked based on `Lifetime Earned Points` and total recycling volume milestones.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "badgeId": "bg-bronze-recycler",
      "title": "Bronze Recycler",
      "earnedAt": "2026-05-01T09:00:00Z"
    },
    {
      "badgeId": "bg-100-items",
      "title": "100 Items Recycled",
      "earnedAt": "2026-08-14T09:00:00Z"
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

## 6. Module 5 — Rewards Marketplace (RWRD / MKT)

### 6.1 Browse Rewards Catalog

**Use Case:** A Recycler browses redeemable rewards.

**Endpoint:** `GET /api/v1/catalog`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes
**FR Reference:** `RWRD-002`

**Description:**
Returns the active (non-archived, in-stock or out-of-stock flagged) rewards catalog. Supports filtering by category and by affordability relative to the caller's own `Available Points` balance.

**Request (query params):**

```
GET /api/v1/catalog?category=vouchers&affordableOnly=true
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "itemId": "cat-101",
      "title": "10 EGP Mobile Recharge",
      "category": "vouchers",
      "pointsCost": 100,
      "stock": 42,
      "status": "in_stock"
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

### 6.2 Create Catalog Item (Admin)

**Use Case:** An Admin adds a new reward to the catalog.

**Endpoint:** `POST /api/v1/admin/catalog`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `RWRD-001`

**Description:**
Creates a new catalog item with its price (in points) and initial stock. Logged to the admin audit trail (`FLT-003`).

**Request:**

```json
{
  "title": "10 EGP Mobile Recharge",
  "description": "Instant top-up voucher",
  "category": "vouchers",
  "pointsCost": 100,
  "stock": 50
}
```

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "itemId": "cat-101",
    "title": "10 EGP Mobile Recharge",
    "pointsCost": 100,
    "stock": 50,
    "status": "in_stock"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 400 | `VALIDATION_ERROR` | Missing/invalid fields (e.g. negative price/stock) |

---

### 6.3 Update Catalog Item (Admin)

**Use Case:** An Admin edits an existing reward's details (price, stock, description).

**Endpoint:** `PUT /api/v1/admin/catalog/{itemId}`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `RWRD-001`

**Description:**
Edits catalog item fields. If `stock` is updated to `0`, the item automatically transitions to `out_of_stock` (`RWRD-001`).

**Request:**

```json
{
  "title": "10 EGP Mobile Recharge",
  "pointsCost": 120,
  "stock": 30
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "itemId": "cat-101",
    "title": "10 EGP Mobile Recharge",
    "pointsCost": 120,
    "stock": 30,
    "status": "in_stock"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `itemId` does not exist |
| 400 | `VALIDATION_ERROR` | Invalid fields |

---

### 6.4 Archive Catalog Item (Admin)

**Use Case:** An Admin retires a reward item so it no longer appears in the catalog.

**Endpoint:** `POST /api/v1/admin/catalog/{itemId}/archive`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `RWRD-001`

**Description:**
Soft-removes the item from Recycler-facing browsing (`6.1`) without deleting its historical redemption records, preserving referential integrity with past vouchers.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "itemId": "cat-101",
    "status": "archived"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `itemId` does not exist |
| 409 | `CONFLICT` | Item already archived |

---

### 6.5 Redeem Voucher

**Use Case:** A Recycler redeems a catalog item using their points.

**Endpoint:** `POST /api/v1/catalog/{itemId}/redemptions`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes (`USER_CITIZEN` only)
**FR Reference:** `RWRD-003`, `RWRD-004`, `FR-RULE-003`

**Description:**
Upon confirmation, atomically deducts the item's point cost from the user's `Available Points`, writes a debit record to the append-only ledger (`RWRD-003`), decrements catalog stock (auto-flipping to out-of-stock at zero — `RWRD-001`), and generates a digital voucher stored in "My Vouchers" (`RWRD-004`).

**Request:** _No body._

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "redemptionId": "rd-552...",
    "itemId": "cat-101",
    "voucherId": "v-330...",
    "voucherCode": "SWB-9F2C-1090",
    "pointsSpent": 100,
    "newAvailablePoints": 240
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | `itemId` does not exist or is archived |
| 409 | `OUT_OF_STOCK` | Item stock is 0 |
| 409 | `INSUFFICIENT_POINTS` | User's `Available Points` < item's `pointsCost` |
| 403 | `ACCOUNT_SUSPENDED` | User is suspended/banned (`IAM-002`) |

---

### 6.6 Get My Vouchers

**Use Case:** A Recycler views the vouchers they've redeemed.

**Endpoint:** `GET /api/v1/vouchers`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes
**FR Reference:** `RWRD-004`

**Description:**
Returns the caller's "My Vouchers" repository — each with its displayable code/barcode/QR representation.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "voucherId": "v-330...",
      "itemTitle": "10 EGP Mobile Recharge",
      "voucherCode": "SWB-9F2C-1090",
      "qrImageUrl": "https://cdn.../voucher-qr.png",
      "redeemedAt": "2026-09-24T10:05:00Z",
      "status": "unused"
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

## 7. Module 6 — Fleet Management & Collector Operations (FLT / COLDASH / BINMAP)

### 7.1 Register Bin (Admin)

**Use Case:** An Admin adds a new smart bin to the fleet.

**Endpoint:** `POST /api/v1/admin/bins`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `FLT-001`

**Description:**
Registers a new physical bin with its location, capacity thresholds, and district assignment. Logged to the admin audit trail (`FLT-003`).

**Request:**

```json
{
  "deviceSerial": "SWB-HW-0045",
  "latitude": 30.0444,
  "longitude": 31.2357,
  "district": "Downtown Cairo",
  "capacityThresholdKg": 50
}
```

**Response — Success (201 Created):**

```json
{
  "success": true,
  "data": {
    "binId": "bin-045",
    "deviceSerial": "SWB-HW-0045",
    "status": "AVAILABLE",
    "fillLevel": 0
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 409 | `DEVICE_ALREADY_REGISTERED` | `deviceSerial` already registered |
| 400 | `VALIDATION_ERROR` | Missing/invalid location or threshold fields |

---

### 7.2 Update Bin (Admin)

**Use Case:** An Admin edits a bin's location, capacity threshold, or district.

**Endpoint:** `PUT /api/v1/admin/bins/{binId}`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `FLT-001`

**Description:**
Edits registration metadata only. Per `FR-RULE-005`, this endpoint (and the Admin interface in general) can **never** trigger a remote lid unlock or any hardware control command — it is metadata-only.

**Request:**

```json
{
  "latitude": 30.045,
  "longitude": 31.236,
  "district": "Downtown Cairo",
  "capacityThresholdKg": 55
}
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "binId": "bin-045",
    "latitude": 30.045,
    "longitude": 31.236,
    "district": "Downtown Cairo",
    "capacityThresholdKg": 55
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `binId` does not exist |
| 400 | `VALIDATION_ERROR` | Invalid fields |

---

### 7.3 Assign Bin to Collector (Admin)

**Use Case:** An Admin assigns a bin to a specific Collector for servicing.

**Endpoint:** `POST /api/v1/admin/bins/{binId}/assignment`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `FLT-001`, `COLDASH-001`

**Description:**
Assigns (or reassigns) a bin to a Collector. Only an Admin can perform this — Collectors cannot self-assign or reassign bins (Collector Restrictions, Roles doc).

**Request:**

```json
{ "collectorId": "c7d2..." }
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "binId": "bin-045",
    "assignedCollectorId": "c7d2...",
    "assignedAt": "2026-09-24T10:00:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |
| 404 | `NOT_FOUND` | `binId` or `collectorId` does not exist |
| 400 | `VALIDATION_ERROR` | `collectorId` does not belong to an `OPS_COLLECTOR` account |

---

### 7.4 Get Public Bin Map

**Use Case:** A Recycler browses the map to find a nearby bin.

**Endpoint:** `GET /api/v1/bins`

**Actor:** `USER_CITIZEN`
**Auth Required:** Yes
**FR Reference:** `BINMAP-001`, `FLT-002`

**Description:**
Returns all bins with their location and general availability status (`AVAILABLE`, `≥80% FULL`, `≥95% FULL / NEEDS SERVICING`) — no assignment or operator-level detail is exposed here.

**Request (query params):**

```
GET /api/v1/bins?lat=30.04&lng=31.23&radiusKm=2
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "binId": "bin-045",
      "latitude": 30.0444,
      "longitude": 31.2357,
      "status": "AVAILABLE",
      "fillLevel": 12
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token missing/invalid |

---

### 7.5 Get Bin Details

**Use Case:** A user views a single bin's live fill level and status.

**Endpoint:** `GET /api/v1/bins/{binId}`

**Actor:** `USER_CITIZEN`, `OPS_COLLECTOR`, `SYS_ADMIN`
**Auth Required:** Yes
**FR Reference:** `FLT-002`

**Description:**
Returns a single bin's operational telemetry. Field visibility differs by role: Recyclers see general status only; Collectors/Admins additionally see the assigned Collector and fill-time prediction.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "binId": "bin-045",
    "latitude": 30.0444,
    "longitude": 31.2357,
    "status": "AVAILABLE",
    "fillLevel": 12,
    "district": "Downtown Cairo"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 404 | `NOT_FOUND` | `binId` does not exist |

---

### 7.6 Get My Assigned Bins (Collector)

**Use Case:** A Collector views the bins assigned to them, with live fill data.

**Endpoint:** `GET /api/v1/collector/bins`

**Actor:** `OPS_COLLECTOR`
**Auth Required:** Yes (`OPS_COLLECTOR` only)
**FR Reference:** `COLDASH-001`

**Description:**
Returns **only** the bins explicitly assigned to the calling Collector (`COLDASH-001`) — the Collector's identity is taken from the JWT, not from a request parameter, so a Collector can never fetch another Collector's assignments. Includes live fill level, fill-time prediction, and overflow alert flags.

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "binId": "bin-045",
      "latitude": 30.0444,
      "longitude": 31.2357,
      "status": "≥80% FULL",
      "fillLevel": 82,
      "predictedFullAt": "2026-09-25T06:00:00Z",
      "overflowAlert": false
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `OPS_COLLECTOR` |

---

### 7.7 Mark Bin as Serviced

**Use Case:** A Collector marks a bin as emptied after physically servicing it.

**Endpoint:** `POST /api/v1/bins/{binId}/service`

**Actor:** `OPS_COLLECTOR` (must be the bin's assigned Collector)
**Auth Required:** Yes (`OPS_COLLECTOR` only)
**FR Reference:** `COLDASH-002`

**Description:**
Immediately resets the bin's fill level to 0% and its status to `AVAILABLE` (`COLDASH-002`). Only the Collector to whom this bin is assigned may call it — a Collector cannot mark another Collector's bin as serviced (Collector Restrictions, Roles doc).

**Request:** _No body._

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "binId": "bin-045",
    "status": "AVAILABLE",
    "fillLevel": 0,
    "servicedAt": "2026-09-24T10:10:00Z"
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not this bin's assigned Collector |
| 404 | `NOT_FOUND` | `binId` does not exist |

---

### 7.8 Get Audit Logs (Admin)

**Use Case:** An Admin reviews the immutable log of every administrative mutation.

**Endpoint:** `GET /api/v1/admin/audit-logs`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `FLT-003`

**Description:**
Returns audit entries capturing Admin ID, action type, resource ID, timestamp, and justification reason for every administrative mutation (user bans, ledger adjustments, catalog changes, fleet updates) (`FLT-003`). Filterable by admin, action type, and date range.

**Request (query params):**

```
GET /api/v1/admin/audit-logs?actionType=USER_SUSPEND&from=2026-09-01
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "auditId": "a-4471...",
      "adminId": "adm-01...",
      "actionType": "USER_SUSPEND",
      "resourceId": "b3f1...",
      "reason": "Repeated fraudulent survey confirmations detected across 5 sessions",
      "timestamp": "2026-09-24T10:00:00Z"
    }
  ]
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |

---

### 7.9 Get Operational Analytics (Admin)

**Use Case:** An Admin views platform-wide KPIs.

**Endpoint:** `GET /api/v1/admin/analytics`

**Actor:** `SYS_ADMIN`
**Auth Required:** Yes (`SYS_ADMIN` only)
**FR Reference:** `FLT-004`

**Description:**
Aggregates and returns key performance metrics: Daily Active Users, points issued vs. redeemed, recycling volume by material type, and contamination rates (`FLT-004`).

**Request (query params):**

```
GET /api/v1/admin/analytics?from=2026-09-01&to=2026-09-24
```

**Response — Success (200 OK):**

```json
{
  "success": true,
  "data": {
    "dailyActiveUsers": 1240,
    "pointsIssued": 58200,
    "pointsRedeemed": 41100,
    "recyclingVolumeByType": {
      "PLASTIC_BOTTLE": 3200,
      "ALUMINUM_CAN": 1800,
      "GLASS": 640
    },
    "contaminationRate": 0.037
  }
}
```

**Response — Errors:**
| Status | Code | When |
|---|---|---|
| 403 | `FORBIDDEN` | Caller is not `SYS_ADMIN` |

---
