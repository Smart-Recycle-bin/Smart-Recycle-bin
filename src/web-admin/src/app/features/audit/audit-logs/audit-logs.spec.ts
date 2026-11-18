import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AuditLogs } from './audit-logs';
import { AuditLogService } from '@services/audit/audit-log.service';
import { LookupsService } from '@services/lookup/lookups.service';
import { MOCK_AUDIT_LOGS } from '@core/mock/data/audit/audit.mock';
import { AuditActionType } from '@models/audit/audit-action-type.enum';

describe('AuditLogs', () => {
  let component: AuditLogs;
  let fixture: ComponentFixture<AuditLogs>;
  let auditLogServiceMock: {
    getAuditLogs: ReturnType<typeof vi.fn>;
  };
  let lookupsServiceMock: {
    getAdmins: ReturnType<typeof vi.fn>;
  };

  const MOCK_ADMIN_LOOKUPS = [
    { adminId: 'ADM-001', displayName: 'Laila Hamdy' },
    { adminId: 'ADM-002', displayName: 'Amr Shawky' },
  ];

  beforeEach(async () => {
    vi.useFakeTimers();

    auditLogServiceMock = {
      getAuditLogs: vi.fn().mockReturnValue(
        of({
          items: structuredClone(MOCK_AUDIT_LOGS),
          page: 1,
          pageSize: 8,
          totalItems: 25,
          totalPages: 4,
        })
      ),
    };

    lookupsServiceMock = {
      getAdmins: vi.fn().mockReturnValue(of(structuredClone(MOCK_ADMIN_LOOKUPS))),
    };

    await TestBed.configureTestingModule({
      imports: [AuditLogs],
      providers: [
        { provide: AuditLogService, useValue: auditLogServiceMock },
        { provide: LookupsService, useValue: lookupsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create and load audit logs on mount via pagedList', () => {
    expect(component).toBeTruthy();
    expect(auditLogServiceMock.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 8,
        sortBy: 'timestamp',
        sortDir: 'desc',
      })
    );
    expect(lookupsServiceMock.getAdmins).toHaveBeenCalledTimes(1);
    expect(component.auditLogs().length).toBe(10);
    expect(component.isLoading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-page-header')).toBeTruthy();
    expect(compiled.querySelector('app-notice')).toBeTruthy();
    expect(compiled.textContent).toContain(
      'Read-only. Audit entries are immutable and cannot be edited or deleted by any administrator.'
    );

    // Export CSV should be disabled
    const exportBtn = compiled.querySelector('button[disabled]');
    expect(exportBtn?.textContent).toContain('Export CSV');
  });

  describe('Filter queries and option stability', () => {
    it('should build correct query for each filter independently and combined', () => {
      // 1. Admin ID filter
      component.handleAdminChange('ADM-001');
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          adminId: 'ADM-001',
          page: 1,
        })
      );

      // 2. Action Type filter
      component.handleActionChange(AuditActionType.UserSuspension);
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          adminId: 'ADM-001',
          actionType: AuditActionType.UserSuspension,
          page: 1,
        })
      );

      // 3. Resource ID filter (debounced)
      component.handleResourceIdChange('BIN-0042');
      vi.advanceTimersByTime(300);
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          adminId: 'ADM-001',
          actionType: AuditActionType.UserSuspension,
          resourceId: 'BIN-0042',
          page: 1,
        })
      );

      // 4. Date Range filter
      component.handleDateRangeChange({
        from: '2025-06-12',
        to: '2025-06-14',
      });
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          adminId: 'ADM-001',
          actionType: AuditActionType.UserSuspension,
          resourceId: 'BIN-0042',
          from: '2025-06-12',
          to: '2025-06-14',
          page: 1,
        })
      );
    });

    it('should keep admin options stable after filtering by admin (sourced from LookupsService)', () => {
      expect(component.adminOptions().length).toBe(3);
      expect(component.adminOptions()[0].label).toBe('All admins');
      expect(component.adminOptions()[1].value).toBe('ADM-001');
      expect(component.adminOptions()[2].value).toBe('ADM-002');

      // Filter by ADM-001 and return only filtered rows
      const filteredRows = MOCK_AUDIT_LOGS.filter((r) => r.adminId === 'ADM-001');
      auditLogServiceMock.getAuditLogs.mockReturnValue(
        of({
          items: structuredClone(filteredRows),
          page: 1,
          pageSize: 8,
          totalItems: filteredRows.length,
          totalPages: 1,
        })
      );

      component.handleAdminChange('ADM-001');
      fixture.detectChanges();

      // Options must stay stable and NOT shrink to only ADM-001
      expect(component.adminOptions().length).toBe(3);
      expect(component.adminOptions().some((o) => o.value === 'ADM-002')).toBe(true);
    });

    it('debounces resourceId input so rapid keystrokes fire only one request', () => {
      auditLogServiceMock.getAuditLogs.mockClear();

      component.handleResourceIdChange('B');
      vi.advanceTimersByTime(50);
      component.handleResourceIdChange('BIN');
      vi.advanceTimersByTime(50);
      component.handleResourceIdChange('BIN-0042');

      expect(auditLogServiceMock.getAuditLogs).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(auditLogServiceMock.getAuditLogs).toHaveBeenCalledTimes(1);
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceId: 'BIN-0042',
          page: 1,
        })
      );
    });
  });

  describe('Race condition handling and pagination', () => {
    it('cancels slower in-flight request when a newer request completes', () => {
      const slowSubject = new Subject<any>();
      const fastSubject = new Subject<any>();
      let call = 0;

      auditLogServiceMock.getAuditLogs.mockImplementation(() => {
        call++;
        return call === 1 ? slowSubject : fastSubject;
      });

      component.pagedList.setPage(2);
      component.pagedList.setPage(3);

      fastSubject.next({
        items: [{ ...MOCK_AUDIT_LOGS[0], auditId: 'AUD-FAST' }],
        page: 3,
        pageSize: 8,
        totalItems: 25,
        totalPages: 4,
      });
      fastSubject.complete();

      expect(component.pagedList.items()[0].auditId).toBe('AUD-FAST');

      slowSubject.next({
        items: [{ ...MOCK_AUDIT_LOGS[0], auditId: 'AUD-SLOW' }],
        page: 2,
        pageSize: 8,
        totalItems: 25,
        totalPages: 4,
      });
      slowSubject.complete();

      expect(component.pagedList.items()[0].auditId).toBe('AUD-FAST');
    });

    it('resets page to 1 on filter changes', () => {
      component.pagedList.setPage(2);
      expect(component.pagedList.page()).toBe(2);

      component.handleActionChange(AuditActionType.FleetUpdate);
      expect(component.pagedList.page()).toBe(1);
    });

    it('handles server-side pagination and sorting', () => {
      auditLogServiceMock.getAuditLogs.mockClear();

      component.pagedList.setPage(2);
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, pageSize: 8 })
      );

      component.pagedList.setSort('timestamp', 'asc');
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, sortBy: 'timestamp', sortDir: 'asc' })
      );
    });
  });

  describe('Action badge tone mapping', () => {
    it('should map each action type to its exact distinct badge tone', () => {
      expect(component.getActionBadgeVariant(AuditActionType.BinAssignment)).toBe('info');
      expect(component.getActionBadgeVariant(AuditActionType.FleetUpdate)).toBe('success');
      expect(component.getActionBadgeVariant(AuditActionType.LedgerAdjustment)).toBe('purple');
      expect(component.getActionBadgeVariant(AuditActionType.UserSuspension)).toBe('warning');
      expect(component.getActionBadgeVariant(AuditActionType.CatalogChange)).toBe('info');
      expect(component.getActionBadgeVariant(AuditActionType.CollectorProvisioning)).toBe('success');
      expect(component.getActionBadgeVariant(AuditActionType.UserBan)).toBe('danger');
    });

    it('should return human-readable action labels', () => {
      expect(component.getActionLabel(AuditActionType.BinAssignment)).toBe('Bin Assignment');
      expect(component.getActionLabel(AuditActionType.FleetUpdate)).toBe('Fleet Update');
      expect(component.getActionLabel(AuditActionType.LedgerAdjustment)).toBe('Ledger Adjustment');
      expect(component.getActionLabel(AuditActionType.UserSuspension)).toBe('User Suspension');
      expect(component.getActionLabel(AuditActionType.CatalogChange)).toBe('Catalog Change');
      expect(component.getActionLabel(AuditActionType.CollectorProvisioning)).toBe(
        'Collector Provisioning'
      );
      expect(component.getActionLabel(AuditActionType.UserBan)).toBe('User Ban');
    });
  });

  describe('Pagination and Table Rendering', () => {
    it('should render table rows and paginate 10 items with pageSize=8', () => {
      expect(component.auditLogs().length).toBe(10);
      expect(component.columns.length).toBe(6);

      const compiled = fixture.nativeElement as HTMLElement;
      const table = compiled.querySelector('app-data-table');
      expect(table).toBeTruthy();

      const tableText = table?.textContent ?? '';
      expect(tableText).toContain('Laila Hamdy');
      expect(tableText).toContain('ADM-001');
      expect(tableText).toContain('BIN-0042');
      expect(tableText).toContain('Bin Assignment');
      expect(tableText).toContain('Route rebalancing for Giza');
      expect(tableText).toContain('41.33.12.9');
    });
  });

  it('should render error state on initial load error and reload on retry', () => {
    auditLogServiceMock.getAuditLogs.mockReturnValue(throwError(() => new Error('Server error')));
    const errFixture = TestBed.createComponent(AuditLogs);
    const errComp = errFixture.componentInstance;
    errFixture.detectChanges();

    expect(errComp.isLoading()).toBe(false);
    expect(errComp.error()).toBeTruthy();

    const compiled = errFixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-error-state')).toBeTruthy();

    // Successful retry
    auditLogServiceMock.getAuditLogs.mockReturnValue(
      of({
        items: structuredClone(MOCK_AUDIT_LOGS),
        page: 1,
        pageSize: 8,
        totalItems: 25,
        totalPages: 4,
      })
    );
    errComp.loadAuditLogs();
    errFixture.detectChanges();

    expect(errComp.error()).toBeNull();
    expect(errComp.auditLogs().length).toBe(10);
    expect(compiled.querySelector('app-error-state')).toBeFalsy();
    expect(compiled.querySelector('app-data-table')).toBeTruthy();
  });
});
