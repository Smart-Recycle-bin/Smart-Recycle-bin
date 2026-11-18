# Feature conventions (every feature prompt follows this)

## 1. Scope

`docs/frontend-scope.md` still rules: build only what the PDF screen and the scope file describe. Anything with undefined behavior is NOT built; a button whose behavior is undefined is rendered DISABLED with a tooltip "Coming soon" and is listed in gap_api.md "Open questions". The prototype tabs "Live | Loading | Empty | Error" are never built. Match the PDF page (light) and p17 (dark) using the existing theme tokens (no hardcoded colors).

## 2. Where things go

`src/app/features/<domain>/<screen>/<screen>.ts|.html|.css|.spec.ts` (page component), sub-components in a `components/` folder inside the screen, screen-only constants (columns, badge variant maps, labels) in `<screen>.config.ts`. Domain folders are the 13 scope domains. Replace the matching placeholder route in `app.routes.ts` with `loadComponent` pointing at the page; keep its `data.title`, the guards and the other routes untouched.

## 3. Component rules

Standalone, `ChangeDetectionStrategy.OnPush`, signals, `inject()`, `input()` / `output()`, `@if` / `@for` with `track`, no `any`, strict templates, bracket access for index signatures. Use the existing shared components; do not edit them. Add a new shared component only if two or more features need it (under `shared/`), and say so in the report. No new dependencies.

## 4. Data loading

For paginated lists and data tables, use `createPagedList` from `src/app/shared/utils/paged-list.ts`. **Pages must NEVER subscribe manually (`.subscribe()`) to load data.**

```typescript
readonly pagedList = createPagedList<Item, Query>({
  fetch: (query) => this.service.getItems(query),
  initial: { pageSize: 10, sortBy: '...', sortDir: 'desc' },
  debounceKeys: ['search'],
  debounceMs: 300,
});
```

**`createPagedList` Features & Rules:**

- **Signals exposed**: `items`, `total`, `totalPages`, `loading` (initial load), `refreshing` (in-flight reload), `error`, `page`, `pageSize`, `sortBy`, `sortDir`, `filters`.
- **Methods**: `setPage(page)`, `setSort(key, dir)`, `patchFilters(partial)`, `setPageSize(size)`, `reload()`.
- **Search debounce & Race-condition prevention**: Keys specified in `debounceKeys` (e.g. `search`) are debounced (default 300ms); all other filters, sort, and page changes execute immediately. `switchMap` cancels pending in-flight requests so slower older responses never overwrite newer ones.
- **Page reset & Clamping**: Any filter, sort, or page size change automatically resets `page` to 1. If a reload/mutation leaves current `page > totalPages`, it automatically clamps to the last available page.
- **Smooth transitions & Non-destructive errors**: Previous `items` remain visible while re-fetching (`refreshing: true`) to prevent table flickering. Service errors populate `error` without clearing existing `items`.
- **Automatic teardown**: Cleans up automatically via injected `DestroyRef`.

**Server-Side Pagination & Lookups Contract:**

- Paginated endpoints (bins, collectors, recyclers, ledger, audit logs, inspections, recent surveys, leaderboard) accept `PageQuery` (`page` 1-based, `pageSize`, `sortBy`, `sortDir`) and return `Observable<Page<T>>` via `ApiClientService.getPaged<T>()`.
- Backward-compatible unpaged fallback: If `page` is omitted, the API returns the raw data array; `getPaged()` automatically derives fallback `Page<T>` metadata when `meta` is absent.
- Lookups: Use `LookupsService` (`core/services/lookup/`) for cached options (`districts`, `collectors`, `admins`) using `shareReplay(1)` and invalidation via `lookupsService.invalidate(...)`. Never derive options from loaded table rows.
- Large entity pickers: For searching and selecting across large datasets (bins, recyclers), use `app-async-select` (`shared/components/form/async-select/`) with ControlValueAccessor, WAI-ARIA combobox/listbox pattern, and `pageSize=20`.

**Tables:**

- Paginated pages bind `app-data-table` in server mode:
  ```html
  <app-data-table
    [columns]="columns"
    [data]="pagedList.items()"
    [loading]="pagedList.refreshing() || pagedList.loading()"
    mode="server"
    [showPagination]="true"
    [page]="pagedList.page()"
    [pageSize]="pagedList.pageSize()"
    [total]="pagedList.total()"
    [sortColumn]="pagedList.sortBy()"
    [sortDir]="pagedList.sortDir()"
    (pageChange)="pagedList.setPage($event)"
    (sortChange)="pagedList.setSort($event.key, $event.dir)"
  />
  ```
- Wrap with `<app-resource-state>` only for initial loading, error, or empty states when `pagedList.items().length === 0`.
- Column configs live in `<screen>.config.ts`; custom cells use `appCell` templates (`app-user-cell`, `app-mono-id-cell`, `app-number-cell`, `app-fill-level-cell`, `app-badge`). Status badge mappings live in the screen config; labels come from the enum `*_LABELS`.

## 5. Forms and mutations

- **Validation & Custom Validators**: Use shared validators in `src/app/shared/validators/` (`trimmedRequired`, `maxLen(n)`, `integer`, `positiveInt`, `nonNegativeInt`, `latitude`, `longitude`, `phone`, `strongTempPassword`, `dateOrder(fromKey, toKey)`). Whitespace-only values fail `trimmedRequired`. Numeric bounds enforce positive/non-negative integers and prevent concatenated input values.
- **Payload Trimming**: Trim all string input values in payload builders before sending mutation requests.
- **Server Error Mapping**: Extract field validation errors using `getFieldErrors(err)` from `core/errors/error-message.ts` (reading `details: [{ field, message }]`) and set `{ serverError: msg }` on the corresponding controls. Continue mapping known domain error codes (e.g. `EMAIL_ALREADY_EXISTS`, `DEVICE_ALREADY_REGISTERED`, `INSUFFICIENT_BALANCE`). Unhandled errors fall back to `ToastService.error(getErrorMessage(err))` (401/403/network/5xx are toasted by the error interceptor; do not duplicate).
- **Accessibility & Association**: Control errors are mapped to visible text and connected via `aria-describedby` referencing `[id]="forId() + '-error'"`.
- **Date Range Filters**: In filter date ranges (`from`, `to`), if `from > to`, display an inline error, do not dispatch network requests, and provide a one-click "Swap dates" action.
- **Money-Affecting Actions & Safety**: Money-affecting actions (such as manual ledger point adjustments) must require an explicit secondary confirmation step using `<app-confirm-dialog>` (with `danger` tone for debits and `brand`/`warning` for credits) summarizing the transaction details (action type, amount, target user, balance before → after, reason). Send an `Idempotency-Key` header (UUID generated upon drawer opening, retained on retries, regenerated after success) to prevent accidental duplicate charges or credits.
- **Submissions & Double-Click Protection**: Disable buttons and set `[loading]="isSubmitting()"` to protect against duplicate submissions. On success, trigger `ToastService.success`, close the drawer/modal, and reload the list. No optimistic updates.

## 6. Formatting

Built-in `DecimalPipe` / `PercentPipe`; points are shown with thousands separators; signed deltas with `formatSignedPoints`.
**Dates and times**: format only through the standalone pure pipes `dateTime` ('YYYY-MM-DD HH:mm', 24h) and `dateOnly` ('YYYY-MM-DD') in `src/app/shared/pipes/` (backed by `formatDateTime` and `formatDate` in `src/app/shared/utils/datetime.ts`). All formatting is locked to `environment.displayTimeZone` (`Africa/Cairo`) using `Intl.DateTimeFormat#formatToParts` to eliminate browser-locale and OS timezone drift. Never output raw date strings or use Angular's built-in `DatePipe` with local timezone.

## 7. Accessibility

Every control labelled, icon buttons have `ariaLabel`, dialogs and drawers keep focus management from the shared components, keyboard operable.

## 8. Tests (vitest)

One spec per page: stub the domain service (`vi.fn` returning `of(...)`, fixtures from `core/mock/data`). Cover: loading → rows rendered, empty, error + retry, a filter change calls the service with the right query, each mutation calls the service, toasts, and reloads. Do not depend on the fake backend in component specs.

## 9. Definition of done

`ng build`, `ng test` and `npm run check:prod-bundle` green; the feature works end-to-end in `ng serve` against the fake backend. Final report: files, deviations from the PDF with the reason, new gap_api.md entries, disabled "Coming soon" buttons.
