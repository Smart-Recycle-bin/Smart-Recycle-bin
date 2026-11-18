import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { createPagedList } from './paged-list';
import { Page } from '@models/common/page.model';

interface TestItem {
  id: string;
  name: string;
}

interface TestFilters {
  search?: string;
  category?: string;
}

describe('createPagedList utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs initial fetch immediately', () => {
    const mockPage: Page<TestItem> = {
      items: [{ id: '1', name: 'Item 1' }],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    };

    const fetchSpy = vi.fn().mockReturnValue(of(mockPage));
    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith({
      page: 1,
      pageSize: 10,
    });
    expect(pagedList.items()).toEqual(mockPage.items);
    expect(pagedList.total()).toBe(1);
    expect(pagedList.totalPages()).toBe(1);
    expect(pagedList.loading()).toBe(false);
    expect(pagedList.error()).toBeNull();

    pagedList.destroy?.();
  });

  it('debounces keystrokes on debouncedKeys (typing "nasr" makes only 1 request)', () => {
    const fetchSpy = vi.fn().mockImplementation((query) =>
      of({
        items: [{ id: '1', name: query.search ?? 'none' }],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      })
    );

    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
      debounceKeys: ['search'],
      debounceMs: 300,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1); // initial fetch

    // Type rapidly: "n", "na", "nas", "nasr" within 100ms
    pagedList.patchFilters({ search: 'n' });
    vi.advanceTimersByTime(50);
    pagedList.patchFilters({ search: 'na' });
    vi.advanceTimersByTime(50);
    pagedList.patchFilters({ search: 'nas' });
    vi.advanceTimersByTime(50);
    pagedList.patchFilters({ search: 'nasr' });

    // Still only initial fetch executed
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Fast-forward remaining debounce time
    vi.advanceTimersByTime(300);

    // Exactly 1 new fetch executed with the final search term
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 10,
      search: 'nasr',
    });
    expect(pagedList.items()[0].name).toBe('nasr');

    pagedList.destroy?.();
  });

  it('handles race conditions: cancels slow in-flight request when faster second request arrives', () => {
    const req1$ = new Subject<Page<TestItem>>();
    const req2$ = new Subject<Page<TestItem>>();
    let callCount = 0;

    const fetchSpy = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? req1$ : req2$;
    });

    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(pagedList.loading()).toBe(true);

    // Second request is made immediately (e.g. page change)
    pagedList.setPage(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Second request finishes FIRST
    req2$.next({
      items: [{ id: '2', name: 'Page 2 item' }],
      page: 2,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    });
    req2$.complete();

    expect(pagedList.items()).toEqual([{ id: '2', name: 'Page 2 item' }]);
    expect(pagedList.page()).toBe(2);

    // First request finishes LATER (should be ignored because switchMap cancelled it)
    req1$.next({
      items: [{ id: '1', name: 'Old slow item' }],
      page: 1,
      pageSize: 10,
      totalItems: 20,
      totalPages: 2,
    });
    req1$.complete();

    // Items should still be from request 2!
    expect(pagedList.items()).toEqual([{ id: '2', name: 'Page 2 item' }]);

    pagedList.destroy?.();
  });

  it('resets page to 1 on filter, sort, or pageSize change', () => {
    const fetchSpy = vi.fn().mockReturnValue(
      of({
        items: [],
        page: 1,
        pageSize: 10,
        totalItems: 50,
        totalPages: 5,
      })
    );

    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
      initial: { page: 3 },
    });

    expect(pagedList.page()).toBe(3);

    // Filter change
    pagedList.patchFilters({ category: 'metal' });
    expect(pagedList.page()).toBe(1);

    // Advance to page 4
    pagedList.setPage(4);
    expect(pagedList.page()).toBe(4);

    // Sort change
    pagedList.setSort('name', 'asc');
    expect(pagedList.page()).toBe(1);

    // Advance to page 4
    pagedList.setPage(4);
    expect(pagedList.page()).toBe(4);

    // PageSize change
    pagedList.setPageSize(25);
    expect(pagedList.page()).toBe(1);

    pagedList.destroy?.();
  });

  it('clamps to last page if current page > totalPages (e.g. after a delete)', () => {
    let returnTotal = 30;
    const fetchSpy = vi.fn().mockImplementation((query) =>
      of({
        items: [{ id: String(query.page), name: `Item on page ${query.page}` }],
        page: query.page,
        pageSize: 10,
        totalItems: returnTotal,
        totalPages: Math.ceil(returnTotal / 10),
      })
    );

    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
      initial: { page: 3 },
    });

    expect(pagedList.page()).toBe(3);
    expect(pagedList.totalPages()).toBe(3);

    // Simulate items deleted from 30 -> 15 (total pages drops to 2)
    returnTotal = 15;
    pagedList.reload();

    // It detects page 3 > totalPages (2), and automatically clamped to page 2
    expect(pagedList.page()).toBe(2);
    expect(pagedList.totalPages()).toBe(2);

    pagedList.destroy?.();
  });

  it('keeps previous items visible while reloading and flags refreshing', () => {
    const reloadSubject = new Subject<Page<TestItem>>();
    let isSecond = false;
    const fetchSpy = vi.fn().mockImplementation(() => {
      if (!isSecond) {
        return of({
          items: [{ id: 'initial', name: 'Initial item' }],
          page: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
        });
      }
      return reloadSubject;
    });

    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
    });

    expect(pagedList.items()).toEqual([{ id: 'initial', name: 'Initial item' }]);
    expect(pagedList.loading()).toBe(false);
    expect(pagedList.refreshing()).toBe(false);

    // Trigger reload
    isSecond = true;
    pagedList.reload();

    // Previous items are still in signal so table doesn't flash
    expect(pagedList.items()).toEqual([{ id: 'initial', name: 'Initial item' }]);
    expect(pagedList.refreshing()).toBe(true);

    // Deliver new items
    reloadSubject.next({
      items: [{ id: 'new', name: 'New item' }],
      page: 1,
      pageSize: 10,
      totalItems: 1,
      totalPages: 1,
    });
    reloadSubject.complete();

    expect(pagedList.items()).toEqual([{ id: 'new', name: 'New item' }]);
    expect(pagedList.refreshing()).toBe(false);

    pagedList.destroy?.();
  });

  it('stores error in error signal without clearing previous items on error', () => {
    let shouldFail = false;
    const fetchSpy = vi.fn().mockImplementation(() => {
      if (shouldFail) {
        return throwError(() => new Error('Server connection lost'));
      }
      return of({
        items: [{ id: 'saved', name: 'Saved item' }],
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      });
    });

    const pagedList = createPagedList<TestItem, TestFilters>({
      fetch: fetchSpy,
    });

    expect(pagedList.items()).toEqual([{ id: 'saved', name: 'Saved item' }]);
    expect(pagedList.error()).toBeNull();

    // Fail subsequent reload
    shouldFail = true;
    pagedList.reload();

    expect(pagedList.error()).toBe('Server connection lost');
    // Previous items MUST remain intact
    expect(pagedList.items()).toEqual([{ id: 'saved', name: 'Saved item' }]);
    expect(pagedList.refreshing()).toBe(false);

    pagedList.destroy?.();
  });
});
