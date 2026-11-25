# Member 2 — Sessions, Surveys, Wallet & SignalR

**الحجم:** 9 Endpoints + SignalR Hub

العضو مسؤول عن دورة الجلسة من فتحها حتى إنهائها، الاستبيان، قرارات المستخدم، تسوية النقاط والـWallet/Ledger، وتحديثات الجلسة اللحظية.

**مصدر العقد:** `EcoBin_V1_Features_API_Contract (1) (1)(1).md`. تم نقل مواصفات الـEndpoints أدناه من العقد الحالي، مع تطبيق قراراتك الأخيرة.

## قواعد مشتركة ملزمة لكل الأعضاء

- Base URL: `/api/v1`.
- كل Entity IDs أرقام صحيحة JSON numbers؛ لا تضيفوا IDs نصية مسبوقة مثل `bin-45`.
- Success envelope: `{ "success": true, "data": ... }`.
- Error envelope: `{ "success": false, "error": { "code": "...", "message": "...", "details": [...] } }`، و`details` اختيارية.
- القوائم المرقمة تستخدم `page` يبدأ من 1، و`pageSize` افتراضي 10 وحد أقصى 100، مع `meta` بجانب `data`.
- لا تُرجعوا كلمات المرور أو hashes أو refresh tokens أو OTPs أو تفاصيل الاستثناءات.
- كل `/admin/*` يتطلب `SYS_ADMIN`. إخفاء الواجهة ليس بديلًا عن Authorization في الـBackend.
- حافظوا على أسماء الحقول والقيم القياسية كما هي في عقد كل Endpoint أدناه.
- لا تنفذوا Collector operational endpoints أو E52 أو أي endpoint غير مدرج في ملف العضو.
- `IdempotencyKey` خارج V1 بالكامل: لا عمود Database ولا middleware ولا logic ولا tests له في هذا الإصدار.
- `NEW-BIN-DISABLE` غير معتمد ومستبعد؛ لا تنفذوا `/admin/bins/{binId}/deactivate` ولا حالة `DISABLED`.

## ملكية جداول قاعدة البيانات

**المالك:** Member 2 يملك دورة الـSession والـSurvey وتسوية النقاط والـWallet والـLedger. Member 3 يملك `DISPOSAL_ITEM` ويستدعي خدمة Member 2 لتحديث نافذة الجلسة بعد وصول عنصر من E21. Member 5 يملك `INSPECTION_REPORT` ويستدعي خدمة التسوية التي يملكها Member 2 بعد حل آخر تقرير.

### `DISPOSAL_SESSION`
```dbml
Table DISPOSAL_SESSION {
  SessionId int [pk]
  StartTime datetime [not null]
  EndTime datetime
  Status varchar [not null] // active | terminated | pending_survey | completed
  TotalPoints int [not null, default: 0]
  UserId int [not null, ref: > USER.UserId]
  BinId int [not null, ref: > SMART_BIN.BinId]
  WindowExpiresAt datetime // NEW: server-side 60-second rolling window
  PointsStatus varchar [not null, default: 'pending'] // pending | awarded
}
```

**لماذا `PointsStatus` على Session؟** لأن E26 يجعل Survey بحالة `done` بمجرد إرسال التصحيحات، بينما تظل نقاط الـSession `pending` حتى يحسم Admin كل تقارير العناصر التابعة لها. فصل حالة الاستبيان عن تسوية النقاط يمنع صرف جزء من النقاط أو صرفها مرتين.

### `DISPOSAL_SURVEY`
```dbml
Table DISPOSAL_SURVEY {
  SurveyId int [pk]
  SessionId int [not null, unique, ref: - DISPOSAL_SESSION.SessionId]
  TotalCalculatedPoints int [not null, default: 0]
  CreatedAt datetime [not null]
  Status varchar [not null, default: 'waiting'] // waiting | done
  Outcome varchar // confirmed | correction_submitted
  SubmittedAt datetime
}
```

### `SURVEY_RESPONSE`
```dbml
Table SURVEY_RESPONSE {
  ResponseId int [pk]
  SurveyId int [not null, ref: > DISPOSAL_SURVEY.SurveyId]
  ItemId int [not null, unique, ref: > DISPOSAL_ITEM.ItemId]
  IsCorrect boolean [not null]
  UserSelectedTypeId int [ref: > WASTE_TYPE.WasteTypeId]
  CreatedAt datetime [not null]
}
```

### `WALLET`
```dbml
Table WALLET {
  WalletId int [pk]
  UserId int [not null, unique, ref: - USER.UserId]
  AvailablePoints int [not null, default: 0]
  LifetimeEarnedPoints int [not null, default: 0]
}
```

### `LEDGER_TRANSACTION`
```dbml
Table LEDGER_TRANSACTION {
  TransactionId int [pk]
  WalletId int [not null, ref: > WALLET.WalletId]
  SessionId int [unique, ref: - DISPOSAL_SESSION.SessionId]
  VoucherId int [unique, ref: - VOUCHER.VoucherId]
  TransactionType varchar [not null] // credit | debit
  PointsDelta int [not null] // signed: credit positive, debit negative
  RunningBalance int [not null]
  Source varchar [not null] // session_award | voucher_redemption | manual_adjustment
  CreatedByAdminId int [ref: > USER.UserId]
  ReasonCode varchar
  ReasonNote varchar
  CreatedAt datetime [not null]
}
```

**قيود مهمة:** `SessionId` يظل Unique لضمان Transaction واحدة كحد أقصى لكل Session. لا تضفوا `IdempotencyKey`؛ هو خارج V1. لا تغيّروا `TransactionType` عن `credit/debit`، ولا تجعلوا `PointsDelta` موجبًا في كل الحالات؛ قيمة debit سالبة. `Source` يوضح مصدر الحركة. `CreatedByAdminId/ReasonCode/ReasonNote` لدعم التعديلات الإدارية المستقبلية/المعتمدة في schema، حتى لو لم يوجد Admin manual-adjustment endpoint ضمن النطاق الحالي.

**حدود الـSurvey:** المستخدم له اختياران فقط: E23 تأكيد كل التصنيفات أو E26 إرسال تصحيحات لعناصر محددة. لا تنفذ E24 أو أي رفض كامل للاستبيان.

### جداول مشتركة — ليست ملك Member 2
- `USER` (Member 1): قراءة UserId وAccountStatus فقط.
- `SMART_BIN` و`DISPOSAL_ITEM` و`WASTE_TYPE` (Member 3): قراءة بيانات الـBin والعناصر والتصنيفات.
- `INSPECTION_REPORT` (Member 5): Member 2 لا يملك الجدول؛ يوفّر Member 5 خدمة إنشاء التقارير من E26. Member 2 يوفّر خدمة `FinalizeSessionPointsAsync(sessionId)` التي يستدعيها Member 5 بعد حسم كل التقارير.
- `VOUCHER` (Member 5): Member 2 لا يملك الجدول؛ E42 يستدعي خدمة خصم النقاط/كتابة الـLedger التي يوفّرها Member 2 ضمن نفس الـUnitOfWork/DB transaction.

## SignalR — إضافة تنفيذية معتمدة بطلب المستخدم

عقد REST الأصلي يحدد `E19` كـPolling API ويذكر SignalR كتحسين لاحق. بناءً على طلب تقسيم الشغل الحالي، سيُنفذ Member 2 SignalR للجلسة في V1 مع الإبقاء على E19 كـREST snapshot/fallback. هذه إضافة realtime وليست REST Endpoint جديدة.

- Hub route: `/hubs/sessions`.
- Authentication: نفس JWT، ويسمح فقط بـ`USER_CITIZEN` مالك الـSession.
- Hub methods: `JoinSession(sessionId)` و`LeaveSession(sessionId)`؛ يجب التحقق من ملكية الجلسة قبل الانضمام إلى group `session:{sessionId}`.
- Server events: `ItemReceived` (itemId, wasteType, estimatedPoints, windowExpiresAt)، `SessionWindowUpdated` (sessionId, windowExpiresAt)، `SessionEnded` (sessionId, status, terminationReason)، `SurveyReady` (sessionId, surveyId).
- لا يرسل العميل بيانات النقاط النهائية أو يحدد انتهاء الجلسة؛ السيرفر هو مصدر الحقيقة ويظل `WindowExpiresAt` محفوظًا في DB.
- E19 يظل متاحًا لجلب الحالة الحالية عند فتح الشاشة/إعادة الاتصال، وللتعامل مع انقطاع SignalR.

## Endpoints المسندة لهذا العضو

### E18 --- `POST /bins/{binId}/sessions` --- Start disposal session (scan QR)

-   **Feature:** QR Session
-   **Platform:** Mobile
-   **Method & URL:** `POST /bins/{binId}/sessions` (full path:
    `/api/v1/bins/{binId}/sessions`)
-   **Authorized role:** USER_CITIZEN

**Business behavior and source contract**

**Actor:** `USER_CITIZEN`. **FR:** TRX-001, TRX-002, FR-RULE-004.
Unlocks the bin lid and starts a 60-second server-side window. The
window expiry is stored as `WindowExpiresAt`; each successfully ingested
item resets it to 60 seconds from the latest accepted item. The session
ends when this window expires or when the owner ends it manually.

V1 does not enforce one-active-session-per-Bin and does not
automatically terminate another user's session when a new QR scan occurs.
That concurrency rule is documented as a possible later enhancement,
not a V1 dependency.

Request: `{ "qrPayload": "45:dyn-8f2c91a0" }` `data` (201):
`{ "sessionId": 9021, "binId": 45, "status": "active", "windowExpiresAt": "2026-11-18T10:01:00Z" }`
Errors: `404 BIN_NOT_FOUND`, `409 BIN_UNSERVICEABLE` (stored status
`NEEDS_SERVICE_95` or `OFFLINE`), `403 ACCOUNT_SUSPENDED`.

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`)

**Request**

``` http
POST /api/v1/bins/45/sessions
Content-Type: application/json

{ "qrPayload": "45:dyn-8f2c91a0" }
```

**Response 201**

``` json
{ "success": true, "data": { "sessionId": 9021, "binId": 45, "status": "active", "windowExpiresAt": "2026-11-18T10:01:00Z" } }
```

**Error example** `409`

``` json
{ "success": false, "error": { "code": "BIN_UNSERVICEABLE", "message": "This bin is full or offline and cannot accept new sessions." } }
```

---

### E19 --- `GET /sessions/{sessionId}` --- Get session status

-   **Feature:** Live Session Status
-   **Platform:** Mobile
-   **Method & URL:** `GET /sessions/{sessionId}` (full path:
    `/api/v1/sessions/{sessionId}`)
-   **Authorized role:** USER_CITIZEN; owner

**Business behavior and source contract**

**Actor:** `USER_CITIZEN` (owner only). Polling endpoint for the live
countdown and item list (may be reduced if the app uses push updates).
`windowExpiresAt` is the current server-side expiry timestamp; the
frontend derives the countdown from it. The backend refreshes this
timestamp after each accepted item. The configured V1 window is 60
seconds.

`data`:

``` json
{
  "sessionId": 9021,
  "binId": 45,
  "status": "active",
  "windowExpiresAt": "2026-11-18T10:01:32Z",
  "items": [ { "itemId": 1, "wasteType": "PLASTIC", "estimatedPoints": 15 } ]
}
```

Errors: `403 FORBIDDEN` (not the owner), `404 NOT_FOUND`.

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`, session owner)

**Request**

``` http
GET /api/v1/sessions/9021
```

**Response 200**

``` json
{
  "success": true,
  "data": {
    "sessionId": 9021,
    "binId": 45,
    "status": "active",
    "windowExpiresAt": "2026-11-18T10:01:32Z",
    "items": [
      { "itemId": 1, "wasteType": "PLASTIC", "estimatedPoints": 15 },
      { "itemId": 2, "wasteType": "METAL", "estimatedPoints": 10 }
    ]
  }
}
```

**Error example** `403`

``` json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "You do not own this session." } }
```

---

### E20 --- `POST /sessions/{sessionId}/end` --- End session manually

-   **Feature:** End Session
-   **Platform:** Mobile
-   **Method & URL:** `POST /sessions/{sessionId}/end` (full path:
    `/api/v1/sessions/{sessionId}/end`)
-   **Authorized role:** USER_CITIZEN; owner

**Business behavior and source contract**

**Actor:** `USER_CITIZEN` (owner only). **FR:** TRX-004. Terminates the
session, locks the lid and moves it to the survey.

`data`:
`{ "sessionId": 9021, "status": "terminated", "terminationReason": "manual" }`
Errors: `403 FORBIDDEN`, `409 SESSION_NOT_ACTIVE`.

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`, session owner)

**Request**

``` http
POST /api/v1/sessions/9021/end
```

**Response 200**

``` json
{ "success": true, "data": { "sessionId": 9021, "status": "terminated", "terminationReason": "manual" } }
```

**Error example** `409`

``` json
{ "success": false, "error": { "code": "SESSION_NOT_ACTIVE", "message": "The session has already ended." } }
```

---

### E22 --- `GET /sessions/{sessionId}/survey` --- Get session survey

-   **Feature:** Post-Disposal Survey
-   **Platform:** Mobile
-   **Method & URL:** `GET /sessions/{sessionId}/survey` (full path:
    `/api/v1/sessions/{sessionId}/survey`)
-   **Authorized role:** USER_CITIZEN; owner

**Business behavior and source contract**

**Actor:** `USER_CITIZEN` (owner only). **FR:** SURV-001. Shown after session termination by timeout or manual end. Survey and
session are 1:1; `surveyId` links this to E25 and E26. A concurrent QR
scan does not terminate another session in V1.

`data`:

``` json
{
  "surveyId": 2043,
  "sessionId": 9021,
  "status": "waiting",
  "items": [
    { "itemId": 1, "wasteType": "PLASTIC", "estimatedPoints": 15 },
    { "itemId": 2, "wasteType": "METAL", "estimatedPoints": 10 }
  ],
  "totalPoints": 25
}
```

Errors: `403 FORBIDDEN`, `404 NOT_FOUND`, `409 SURVEY_ALREADY_RESOLVED`.

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`, session owner)

**Request**

``` http
GET /api/v1/sessions/9021/survey
```

**Response 200**

``` json
{
  "success": true,
  "data": {
    "surveyId": 2043,
    "sessionId": 9021,
    "status": "waiting",
    "items": [
      { "itemId": 1, "wasteType": "PLASTIC", "estimatedPoints": 15 },
      { "itemId": 2, "wasteType": "METAL", "estimatedPoints": 10 }
    ],
    "totalPoints": 25
  }
}
```

**Error example** `409`

``` json
{ "success": false, "error": { "code": "SURVEY_ALREADY_RESOLVED", "message": "This survey has already been submitted." } }
```

---

### E23 --- `POST /sessions/{sessionId}/survey/confirm` --- Confirm survey

-   **Feature:** Confirm Survey
-   **Platform:** Mobile
-   **Method & URL:** `POST /sessions/{sessionId}/survey/confirm` (full
    path: `/api/v1/sessions/{sessionId}/survey/confirm`)
-   **Authorized role:** USER_CITIZEN; owner

**Business behavior and source contract**

**Actor:** `USER_CITIZEN` (owner only). **FR:** SURV-002, FR-RULE-003.
Atomic (ACID): when the user confirms all AI classifications without
changes, credits the session's final points to Available and Lifetime
points and appends exactly one `session_award` ledger entry linked to
the Session. The Session is the financial unit: at most one points
transaction may be created for it. No body.

`data`:
`{ "sessionId": 9021, "surveyStatus": "done", "outcome": "confirmed", "pointsStatus": "awarded", "pointsAwarded": 25, "newAvailablePoints": 340, "newLifetimePoints": 1250 }`
Errors: `403 FORBIDDEN`, `409 SURVEY_ALREADY_RESOLVED`.

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`, session owner)

**Request**

``` http
POST /api/v1/sessions/9021/survey/confirm
```

**Response 200**

``` json
{ "success": true, "data": { "sessionId": 9021, "surveyStatus": "done", "outcome": "confirmed", "pointsStatus": "awarded", "pointsAwarded": 25, "newAvailablePoints": 340, "newLifetimePoints": 1250 } }
```

**Error example** `409`

``` json
{ "success": false, "error": { "code": "SURVEY_ALREADY_RESOLVED", "message": "This survey has already been submitted." } }
```

---

### E25 --- `GET /surveys` --- My surveys list

-   **Feature:** Survey History
-   **Platform:** Mobile
-   **Method & URL:** `GET /surveys` (full path: `/api/v1/surveys`)
-   **Authorized role:** USER_CITIZEN

**Business behavior and source contract**

**Actor:** `USER_CITIZEN`. **Screen:** Surveys List. Query:
`status=all|waiting|done` (default `all`), `page`, `pageSize`.
Paginated; `meta` also carries `pendingPoints` (total estimated points
of surveys whose points have not yet been awarded. `done` means the
user has submitted the survey; its `outcome` is either `confirmed` or
`correction_submitted`. A correction-submitted survey can be `done` while
its session points remain `pending` until Admin resolves every report
created by that session.

`data` items:

``` json
[
  {
    "surveyId": 2043, "surveyNumber": 2043, "sessionId": 9021,
    "binId": 420, "binName": "Bin#420", "status": "waiting",
    "estimatedPoints": 25, "createdAt": "2026-11-18T10:02:00Z"
  },
  {
    "surveyId": 2041, "surveyNumber": 2041, "sessionId": 9018,
    "binId": 420, "binName": "Bin#420", "status": "done",
    "outcome": "confirmed", "pointsStatus": "awarded", "pointsAwarded": 30, "createdAt": "2026-11-18T13:23:00Z"
  }
]
```

Relative time text ("Today, 10:30 PM") is formatted by the frontend.

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`)

**Request**

``` http
GET /api/v1/surveys?status=all&page=1&pageSize=10
```

**Response 200**

``` json
{
  "success": true,
  "data": [
    {
      "surveyId": 2043, "surveyNumber": 2043, "sessionId": 9021,
      "binId": 45, "binName": "Bin#045", "status": "waiting", "outcome": null, "pointsStatus": "pending",
      "estimatedPoints": 25, "createdAt": "2026-11-18T10:02:00Z"
    },
    {
      "surveyId": 2041, "surveyNumber": 2041, "sessionId": 9018,
      "binId": 420, "binName": "Bin#420", "status": "done",
      "outcome": "confirmed", "pointsStatus": "awarded", "pointsAwarded": 30, "createdAt": "2026-11-17T13:23:00Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 2, "totalPages": 1, "pendingPoints": 25 }
}
```

**Error example** `400`

``` json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid status filter.", "details": [ { "field": "status", "message": "Must be all, waiting or done." } ] } }
```

---

### E26 --- `POST /surveys/{surveyId}/submit` --- Submit survey with corrections and AI rating

-   **Feature:** Submit Item Corrections
-   **Platform:** Mobile
-   **Method & URL:** `POST /surveys/{surveyId}/submit` (full path:
    `/api/v1/surveys/{surveyId}/submit`)
-   **Authorized role:** USER_CITIZEN; survey owner

**Business behavior and source contract**

**Actor:** `USER_CITIZEN` (owner only). **Screen:** Verify Items. The
user has exactly two choices across the survey flow: confirm all AI
classifications using E23, or submit corrections using this endpoint.
There is no separate user Reject Survey action. A correction is treated
as an objection and sends each conflicting item to Admin review.

The survey is marked `done` with outcome `correction_submitted`, but
Session points remain `pending`; no points are credited at this stage.
Each conflicting item creates one Inspection Report (returned in
`flaggedReportIds`). Admin reviews only these submitted reports. After
all reports belonging to the Session are resolved, the backend
calculates the final points for the whole Session and creates exactly
one ledger transaction for that Session. The final amount uses the
Admin-confirmed classification for corrected items and the original AI
classification for dismissed disputes. This prevents partial or
duplicate point payments.

Request:

``` json
{
  "aiRating": 4,
  "items": [
    { "itemId": 1, "confirmedWasteType": "PLASTIC" },
    { "itemId": 3, "confirmedWasteType": "ORGANIC" }
  ]
}
```

`data`:

``` json
{
  "surveyId": 2043,
  "sessionId": 9021,
  "surveyStatus": "done",
  "outcome": "correction_submitted",
  "pointsStatus": "pending",
  "pointsAwarded": null,
  "flaggedReportIds": ["2"]
}
```

Points are not awarded until every report created by this Session has
been resolved by Admin. The final Session points are calculated once
from the final classification of every item. Errors: `403 FORBIDDEN`, `404 NOT_FOUND`,
`409 SURVEY_ALREADY_RESOLVED`, `400 VALIDATION_ERROR`.

------------------------------------------------------------------------

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`, survey owner)

**Request** (the user changed item `2` from METAL to PLASTIC, which
conflicts with the AI)

``` http
POST /api/v1/surveys/2043/submit
Content-Type: application/json

{
  "aiRating": 4,
  "items": [
    { "itemId": 1, "confirmedWasteType": "PLASTIC" },
    { "itemId": 2, "confirmedWasteType": "PLASTIC" }
  ]
}
```

**Response 200** (the survey is submitted; points remain pending until
Admin resolves all reports for this Session)

``` json
{
  "success": true,
  "data": {
    "surveyId": 2043,
    "sessionId": 9021,
    "surveyStatus": "done",
    "outcome": "correction_submitted",
    "pointsStatus": "pending",
    "pointsAwarded": null,
    "flaggedReportIds": ["2"]
  }
}
```

**Error example** `409`

``` json
{ "success": false, "error": { "code": "SURVEY_ALREADY_RESOLVED", "message": "This survey has already been submitted." } }
```

------------------------------------------------------------------------

**V1 persistence rules for Sessions, Surveys and Wallet**

-   Store `WindowExpiresAt` on the Session. The V1 window is 60 seconds
    and resets after each accepted item.
-   Store survey completion/outcome on the Survey, but store points
    settlement status on the Session (`pending` or `awarded`).
-   Keep `LEDGER_TRANSACTION.SessionId` unique: one Session can create
    at most one points-award transaction. For a corrected Session, wait
    until all its Inspection Reports are resolved, calculate the final
    Session total, then create that single transaction.
-   V1 does not enforce one active Session per Bin.

------------------------------------------------------------------------

---

### E32 --- `GET /wallet/balance` --- Wallet balance

-   **Feature:** Wallet Balance
-   **Platform:** Mobile
-   **Method & URL:** `GET /wallet/balance` (full path:
    `/api/v1/wallet/balance`)
-   **Authorized role:** USER_CITIZEN

**Business behavior and source contract**

**Actor:** `USER_CITIZEN`. **FR:** WLET-002.

`data`: `{ "availablePoints": 340, "lifetimeEarnedPoints": 1250 }`

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`)

**Request**

``` http
GET /api/v1/wallet/balance
```

**Response 200**

``` json
{ "success": true, "data": { "availablePoints": 340, "lifetimeEarnedPoints": 1250 } }
```

**Error example** `401`

``` json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Access token is missing or invalid." } }
```

---

### E33 --- `GET /wallet/ledger` --- My ledger

-   **Feature:** Wallet Ledger
-   **Platform:** Mobile
-   **Method & URL:** `GET /wallet/ledger` (full path:
    `/api/v1/wallet/ledger`)
-   **Authorized role:** USER_CITIZEN

**Business behavior and source contract**

**Actor:** `USER_CITIZEN`. **FR:** WLET-001. Paginated, own entries
only.

`data` items:

``` json
[
  {
    "transactionId": 771, "timestamp": "2026-11-18T10:02:00Z", "binId": 45,
    "entryType": "credit", "pointsDelta": 25, "balanceAfter": 340,
    "source": "session_award", "sourceId": 9021
  },
  {
    "transactionId": 770, "timestamp": "2026-11-14T14:15:00Z", "binId": null,
    "entryType": "debit", "pointsDelta": -100, "balanceAfter": 315,
    "source": "voucher_redemption", "sourceId": 552
  }
]
```

------------------------------------------------------------------------

**HTTP request / response example**

**Auth:** Bearer (`USER_CITIZEN`)

**Request**

``` http
GET /api/v1/wallet/ledger?page=1&pageSize=10
```

**Response 200**

``` json
{
  "success": true,
  "data": [
    { "transactionId": 771, "timestamp": "2026-11-18T10:02:00Z", "binId": 45, "entryType": "credit", "pointsDelta": 25, "balanceAfter": 340, "source": "session_award", "sourceId": 9021 },
    { "transactionId": 770, "timestamp": "2026-11-14T14:15:00Z", "binId": null, "entryType": "debit", "pointsDelta": -100, "balanceAfter": 315, "source": "voucher_redemption", "sourceId": 552 }
  ],
  "meta": { "page": 1, "pageSize": 10, "totalItems": 2, "totalPages": 1 }
}
```

**Error example** `401`

``` json
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "Access token is missing or invalid." } }
```

------------------------------------------------------------------------

---

## قواعد التنسيق بين الأعضاء

1. اتفقوا على DTOs وEnums وأسماء الخدمات المشتركة قبل بدء التنفيذ المتوازي.
2. مالك الجدول وحده ينفذ Migrations وتغييرات Schema. الأعضاء الآخرون يستهلكون خدماته/واجهاته ولا يكررون نفس الجداول أو migrations.
3. استخدموا نفس `EcoBinDbContext` و`UnitOfWork` الموجودين بالمشروع؛ لا ينشئ كل عضو DbContext أو UnitOfWork منفصلًا.
4. أي عملية تجمع Wallet + Ledger + Voucher/Reward stock أو Session + Survey + Reports يجب أن تتم داخل DB transaction واحدة.
5. `USER.LastActiveAt` و`AccountStatus` و`IsEmailVerified` يديرها Member 1؛ `WarningCount` يبقى داخل USER ولا يوجد USER_WARNING table.

## اختبارات قبول خاصة بالعضو
- WindowExpiresAt = 60 ثانية عند بدء الجلسة، ويُعاد ضبطه بعد كل عنصر مقبول.
- انتهاء النافذة أو E20 ينهي الجلسة ويجعل الاستبيان متاحًا.
- E23 يمنح النقاط مرة واحدة فقط؛ E26 لا يمنح النقاط حتى حسم كل التقارير.
- بعد آخر قرار Admin تُحسب نقاط Session كاملة ويُكتب Ledger transaction واحدة.
- E19 يعيد snapshot صحيحًا حتى مع انقطاع SignalR.
