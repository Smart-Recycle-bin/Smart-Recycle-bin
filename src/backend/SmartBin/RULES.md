# RULES.md

## 1. Working method (no assumptions)

- Before writing any code, inspect the existing project: structure, naming, base classes, existing repositories, services, DTOs, error/exception types, response wrappers, authentication setup, and the entities owned by other members.
- Reuse what exists exactly as it is. Match real class names, property names, namespaces, folder layout and coding style.
- Never invent a class, property, service, interface, enum value, claim name or role name. If something required does not exist or you cannot find it with certainty, stop and write one short message listing exactly what is missing. Do not write code until I answer.
- Do not guess behavior that is not written in the prompt. Implement exactly what the prompt says.
- Do not modify existing files except to register new services/repositories/DbSets/hub in the existing registration points and the existing IUnitOfWork/UnitOfWork.

## 2. Output rules

- Output code only. No code comments of any kind, no XML documentation, no TODOs, no explanations, no summaries.
- Do not add anything not requested: no extra endpoints, no unit tests, no extra helpers, no extra files.

## 3. API conventions

- Base route: /api/v1. JSON is camelCase. All entity IDs are JSON numbers (int).
- Success envelope: { "success": true, "data": ... }
- Error envelope: { "success": false, "error": { "code": "...", "message": "...", "details": [ { "field": "...", "message": "..." } ] } } where details is optional.
- Paginated lists: add "meta": { page, pageSize, totalItems, totalPages } beside data. page starts at 1, pageSize default 10, max 100. Invalid values return 400 VALIDATION_ERROR with details.
- Dates are UTC ISO-8601 with Z.
- Never return passwords, hashes, refresh tokens, OTPs, stack traces or exception details.
- Field names, error codes and values given in a prompt are fixed and must not be renamed.
- Reuse the existing response wrapper, exception types and global exception handling. Create them only if they truly do not exist.

## 4. Authentication and tokens

- Login, register, refresh token, logout, JWT generation and JWT Bearer configuration are already implemented and working. Do not create, change or duplicate them and do not add another authentication scheme.
- Reuse the existing setup exactly: the real claim type that carries the UserId, the real role claim type, the exact role name for citizens (USER_CITIZEN), and the existing authorization attribute/policy style used by other controllers.
- UserId must come only from the validated token claims through the existing current-user helper. Never accept a user id from body, query or route.
- Missing, invalid or expired token -> 401 UNAUTHORIZED with message "Access token is missing or invalid." Valid token with a wrong role -> 403 FORBIDDEN. Use the existing mechanism for these responses; add handling only if it is missing.
- Resource owned by another user -> 403 FORBIDDEN. Resource that does not exist -> 404 with the endpoint's 404 code.
- The only allowed authentication change: accept the "access_token" query string for paths under /hubs/sessions in JwtBearerEvents.OnMessageReceived, only if not already configured.

## 5. Architecture

- Controller -> Service -> Repository through the existing UnitOfWork and the existing EcoBinDbContext. Never create a second DbContext or UnitOfWork.
- Controllers contain no business logic.
- Any operation that touches more than one of Wallet, Ledger, Session, Survey, Inspection Reports, Voucher stock must run inside one database transaction and roll back fully on failure.
- Read queries use AsNoTracking and projections. No N+1 queries.

## 6. Ownership boundaries

- I am Member 2. I own: DISPOSAL_SESSION, DISPOSAL_SURVEY, SURVEY_RESPONSE, WALLET, LEDGER_TRANSACTION, the sessions SignalR hub, and the points settlement and wallet services.
- Do not create or change tables owned by others: USER (Member 1), SMART_BIN, DISPOSAL_ITEM, WASTE_TYPE (Member 3), INSPECTION_REPORT and VOUCHER (Member 5). Only read them or call their services.
- For hardware commands (unlock or lock the bin lid): call an existing service only if one already exists in the project; otherwise skip the call and do not create one.

## 7. Out of scope (never implement)

- IdempotencyKey in any form. E24 or any "reject whole survey" action. NEW-BIN-DISABLE, the /admin/bins/{binId}/deactivate endpoint and the DISABLED bin status. Collector operational endpoints. E52. One-active-session-per-bin enforcement. Any endpoint not listed in my prompts.

## 8. Project facts (I fill these in; if empty, find them in the code, and if not found with certainty, ask me)

- Current-user helper (class/interface and method that returns the UserId):
- Claim type holding the UserId:
- Citizen role name constant:
- Suspended account status value in USER.AccountStatus:
- Bin status values for NEEDS_SERVICE_95 and OFFLINE:
- Existing pagination meta class:
- Existing exception type for 400/403/404/409 and its error-code parameter:
- Existing bin lid lock/unlock service (or "none"):
- Member 5 service for creating inspection reports from E26 (interface and method):
- Member 5 method to check that all reports of a session are resolved, and to read each report's final Admin-confirmed waste type:
- Existing way to compute estimated points per item / points per waste type:
