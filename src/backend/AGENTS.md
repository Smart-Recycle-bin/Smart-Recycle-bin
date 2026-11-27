# SmartBin backend — local AI instructions

Before editing this backend, read the workspace `AGENTS.md` and the complete EcoBin reference files under `docs/ai/ecobin-admin/`.

## Backend-specific rules

- Keep the existing ASP.NET Core / EF Core / SQL Server / Identity architecture and current Controller -> Service -> Repository/UnitOfWork -> DbContext flow. Follow the nearest existing feature convention.
- Do not replace Identity or change existing integer primary-key types. Resolve stable public string IDs at the API/service boundary.
- Use DTOs, validation, async EF operations, SQL-side pagination, UTC timestamps, transactions for multi-record writes, and migrations for schema changes.
- Never return EF entities directly. Never trust a client-provided acting-admin ID or role.
- Every Admin endpoint/action must enforce `SYS_ADMIN` server-side.
- Do not add a dependency on unavailable Member 5, external AI, ML, email, or storage services for an Admin workflow. Do not claim a local queue is model retraining.
- Do not return fake analytics, generated IDs unrelated to persisted rows, or fabricated measurements.
- Keep secrets out of tracked configuration and logs. CORS must be explicit and configurable.
- Demo data must be idempotent and Development-only. Never truncate or reset existing data.
- Do not touch Angular source from a backend-only phase unless the prompt explicitly requires a coordinated contract change.
- Follow the current phase prompt exactly; no unrelated cleanup.

Testing-stage exception: only during the dedicated testing phase may temporary test projects/files be created, under the rules in `docs/ai/ecobin-admin/07_TESTING_AND_CLEANUP_RULES.md`. They must be removed/restored after execution as instructed.
