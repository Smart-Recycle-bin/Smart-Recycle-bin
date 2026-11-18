import { DestroyRef, inject, Signal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { defer, of, Subject, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Page, PageQuery } from '@models/common/page.model';
import { SortDirection } from '../components/table/data-table/data-table';

export interface PagedListOptions<T, F extends object = Record<string, unknown>> {
  fetch: (query: F & PageQuery) => import('rxjs').Observable<Page<T>>;
  initial?: {
    page?: number;
    pageSize?: number;
    sortBy?: string | null;
    sortDir?: SortDirection;
    filters?: F;
  };
  debounceKeys?: (keyof F & string)[];
  debounceMs?: number;
  destroyRef?: DestroyRef;
}

export interface PagedList<T, F extends object = Record<string, unknown>> {
  readonly items: Signal<T[]>;
  readonly total: Signal<number>;
  readonly totalPages: Signal<number>;
  readonly loading: Signal<boolean>;
  readonly refreshing: Signal<boolean>;
  readonly error: Signal<string | null>;
  readonly page: Signal<number>;
  readonly pageSize: Signal<number>;
  readonly sortBy: Signal<string | null>;
  readonly sortDir: Signal<SortDirection>;
  readonly filters: Signal<F>;

  setPage(page: number): void;
  setSort(sortBy: string | null, sortDir: SortDirection): void;
  patchFilters(patch: Partial<F>): void;
  setPageSize(pageSize: number): void;
  reload(): void;
  destroy?(): void;
}

interface RequestTrigger<F> {
  query: F & PageQuery;
  immediate: boolean;
  force?: boolean;
}

export function createPagedList<T, F extends object = Record<string, unknown>>(
  options: PagedListOptions<T, F>
): PagedList<T, F> {
  let destroyRef: DestroyRef | null | undefined = options.destroyRef;
  if (!destroyRef) {
    try {
      destroyRef = inject(DestroyRef, { optional: true });
    } catch {
      destroyRef = undefined;
    }
  }
  const debounceKeys = options.debounceKeys ?? (['search'] as (keyof F & string)[]);
  const debounceMs = options.debounceMs ?? 300;

  const items = signal<T[]>([]);
  const total = signal<number>(0);
  const totalPages = signal<number>(0);
  const loading = signal<boolean>(true);
  const refreshing = signal<boolean>(false);
  const error = signal<string | null>(null);

  const page = signal<number>(options.initial?.page ?? 1);
  const pageSize = signal<number>(options.initial?.pageSize ?? 10);
  const sortBy = signal<string | null>(options.initial?.sortBy ?? null);
  const sortDir = signal<SortDirection>(options.initial?.sortDir ?? null);
  const filters = signal<F>({ ...(options.initial?.filters ?? ({} as F)) });

  let hasLoadedFirstTime = false;

  function buildQuery(): F & PageQuery {
    const q: Record<string, unknown> = {
      page: page(),
      pageSize: pageSize(),
      ...filters(),
    };

    const currentSort = sortBy();
    const currentDir = sortDir();
    if (currentSort && currentDir) {
      q['sortBy'] = currentSort;
      q['sortDir'] = currentDir;
    }

    return q as F & PageQuery;
  }

  const trigger$ = new Subject<RequestTrigger<F>>();

  const stream$ = trigger$.pipe(
    switchMap((req) => {
      if (req.immediate) {
        return of(req);
      }
      return timer(debounceMs).pipe(map(() => req));
    }),
    tap(() => {
      if (hasLoadedFirstTime) {
        refreshing.set(true);
      } else {
        loading.set(true);
      }
      error.set(null);
    }),
    switchMap((req) =>
      defer(() => options.fetch(req.query)).pipe(
        map((pageData) => ({ ok: true as const, data: pageData })),
        catchError((err) => {
          const message =
            typeof err === 'string'
              ? err
              : err?.error?.message || err?.message || 'Failed to load records.';
          return of({ ok: false as const, error: message });
        })
      )
    )
  );

  const sub = (destroyRef ? stream$.pipe(takeUntilDestroyed(destroyRef)) : stream$).subscribe(
    (result) => {
      loading.set(false);
      refreshing.set(false);
      hasLoadedFirstTime = true;

      if (result.ok) {
        const pageData = result.data;
        total.set(pageData.totalItems);
        totalPages.set(pageData.totalPages);
        error.set(null);

        // If current page becomes > totalPages (e.g. after a delete) go to the last page
        if (pageData.totalPages > 0 && page() > pageData.totalPages) {
          setPage(pageData.totalPages);
          return;
        }

        items.set(pageData.items);
      } else {
        error.set(result.error);
        // Errors land in error without clearing items
      }
    }
  );

  function setPage(newPage: number): void {
    const validPage = Math.max(1, newPage);
    page.set(validPage);
    trigger$.next({ query: buildQuery(), immediate: true });
  }

  function setSort(newSortBy: string | null, newSortDir: SortDirection): void {
    sortBy.set(newSortBy);
    sortDir.set(newSortDir);
    page.set(1);
    trigger$.next({ query: buildQuery(), immediate: true });
  }

  function setPageSize(newPageSize: number): void {
    pageSize.set(newPageSize);
    page.set(1);
    trigger$.next({ query: buildQuery(), immediate: true });
  }

  function patchFilters(patch: Partial<F>): void {
    const updated = { ...filters(), ...patch };
    filters.set(updated);
    page.set(1);

    const hasDebouncedKey = Object.keys(patch).some((key) =>
      debounceKeys.includes(key as keyof F & string)
    );

    trigger$.next({ query: buildQuery(), immediate: !hasDebouncedKey });
  }

  function reload(): void {
    trigger$.next({ query: buildQuery(), immediate: true, force: true });
  }

  // Trigger initial fetch
  trigger$.next({ query: buildQuery(), immediate: true });

  return {
    items: items.asReadonly(),
    total: total.asReadonly(),
    totalPages: totalPages.asReadonly(),
    loading: loading.asReadonly(),
    refreshing: refreshing.asReadonly(),
    error: error.asReadonly(),
    page: page.asReadonly(),
    pageSize: pageSize.asReadonly(),
    sortBy: sortBy.asReadonly(),
    sortDir: sortDir.asReadonly(),
    filters: filters.asReadonly(),

    setPage,
    setSort,
    patchFilters,
    setPageSize,
    reload,
    destroy: () => sub.unsubscribe(),
  };
}
