# EcoBin workspace — mandatory AI instructions

You are working on the existing EcoBin Admin Web + ASP.NET Core backend integration. The final objective is to make every active Admin Web feature work end-to-end with real persisted SQL Server data, secure backend authorization, correct API contracts, and a verifiable user flow.

## Read before acting

1. `docs/ai/ecobin-admin/00_START_HERE.md`
2. `docs/ai/ecobin-admin/01_ARCHITECTURE_AND_AGENT_RULES.md`
3. `docs/ai/ecobin-admin/02_WEB_ADMIN_API_GAP_MATRIX.md`
4. `docs/ai/ecobin-admin/04_DATA_SEEDING_AND_MANUAL_VERIFICATION.md`
5. `docs/ai/ecobin-admin/05_BLOCKERS_AND_PRODUCT_DECISIONS.md`
6. `docs/ai/ecobin-admin/06_AI_ROLES_AND_EXECUTION_ORDER.md`
7. `docs/ai/ecobin-admin/07_TESTING_AND_CLEANUP_RULES.md` during preflight; execute its testing instructions only in dedicated Stage 4.
8. `docs/ai/ecobin-admin/08_API_REQUEST_RESPONSE_EXAMPLES.md` whenever an API contract is involved.

Read `03_ROADMAP_AND_PHASE_PROMPTS.md` for the exact prompt of the current phase. Actual project paths are `backend/SmartBin/SmartBin/` and `web-admin/`; the backend instruction file is `backend/AGENTS.md`. Read the full reference pack at the start of a new task, then inspect only the source files relevant to that phase.

## Non-negotiable boundaries

- Admin Web scope only. Do not implement mobile, collector-mobile, firmware, device commands, or citizen-only features unless a shared backend dependency is strictly required by an Admin feature.
- Preserve the existing architecture and working behavior. No broad rewrites, framework changes, mass renames, or unrelated refactors.
- Keep SQL/EF internal integer primary keys. Implement a stable public-ID mapping for the web contract; never convert the existing PK types as a shortcut.
- Do not invent data, analytics, AI capabilities, weights, model metadata, or historical trends. Make unavailable data explicit and truthful.
- Inspection/review UI that belongs to Admin Web is in scope. Do not make the Admin Web depend on unavailable external AI/ML services. Local persistence and ordinary backend refactoring are acceptable where required by the Admin workflow.
- Every Admin write must be authorized server-side for `SYS_ADMIN`; frontend guards are not security.
- Use real persisted data; no mock arrays or hard-coded production responses.
- Follow the phase sequence. One prompt/phase at a time. Plan and list affected files before edits. Stop after reporting the phase result and wait for human approval.
- Testing is governed by `07_TESTING_AND_CLEANUP_RULES.md`: no temporary tests during Phases 0--18; temporary tests/E2E are allowed only in dedicated Stage 4 and must be cleaned up.
- Never print, copy, commit, or log secrets found in configuration. Report credential classes and recommend rotation without exposing values.

## Phase completion report

Report changed files, endpoints, migrations, build/test commands actually run and results, manual verification steps, remaining limitations, and whether temporary test artifacts were cleaned up (testing stage only). Never claim a check passed unless it was actually run.
