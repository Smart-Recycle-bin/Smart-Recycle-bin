# web-admin Angular — local AI instructions

Before editing this frontend, read the workspace `AGENTS.md` and the complete EcoBin reference files under `docs/ai/ecobin-admin/`.

## Frontend-specific rules

- Preserve Angular standalone architecture, feature folders, routing, shared components, RxJS/Signals conventions, Tailwind 4, and the centralized API client.
- Keep endpoint paths in `API_ENDPOINTS`; do not scatter literal URLs through feature services.
- Use `ApiClientService` and the existing auth interceptor. Do not manually attach bearer tokens in ordinary feature services.
- Keep TypeScript models aligned with the actual API contract. Handle loading, empty, validation, authorization, not-found, conflict, and server-error states distinctly.
- Remove mocks only from active production paths when the matching real API is ready. Do not silently convert API failures into empty arrays.
- Preserve the current Admin UI and user flows. Change presentation only when needed to fix a real integration mismatch or truthfully represent unavailable data.
- Do not add citizen/mobile/collector-mobile pages or workflows.
- Do not put business rules in components or introduce a second API client/state framework.
- Do not store secrets in Angular environment files or bundles.
- Do not touch backend source during a frontend-only phase unless the prompt explicitly requires a coordinated API contract change.
- Follow the current phase prompt exactly; no unrelated cleanup.

Testing-stage exception: only during the dedicated testing phase may temporary test files/configuration be created, under the rules in `docs/ai/ecobin-admin/07_TESTING_AND_CLEANUP_RULES.md`. They must be removed/restored after execution as instructed.
