import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuditLogs } from './audit-logs';
import { AuditLogService } from '../../../core/services/audit/audit-log.service';
import { MOCK_AUDIT_LOGS } from '../../../core/mock/data/audit/audit.mock';
import { AuditActionType } from '../../../core/models/audit/audit-action-type.enum';

describe('AuditLogs', () => {
  let component: AuditLogs;
  let fixture: ComponentFixture<AuditLogs>;
  let auditLogServiceMock: {
    getAuditLogs: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auditLogServiceMock = {
      getAuditLogs: vi.fn().mockReturnValue(
        of({
          items: structuredClone(MOCK_AUDIT_LOGS),
          page: 1,
          pageSize: 10,
          totalItems: MOCK_AUDIT_LOGS.length,
          totalPages: Math.ceil(MOCK_AUDIT_LOGS.length / 10),
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AuditLogs],
      providers: [
        {
          provide: AuditLogService,
          useValue: auditLogServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load audit logs on mount', () => {
    expect(component).toBeTruthy();
    expect(auditLogServiceMock.getAuditLogs).toHaveBeenCalledWith({});
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
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith({
        adminId: 'ADM-001',
      });

      // 2. Action Type filter
      component.handleActionChange(AuditActionType.UserSuspension);
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith({
        adminId: 'ADM-001',
        actionType: AuditActionType.UserSuspension,
      });

      // 3. Resource ID filter
      component.handleResourceIdChange('BIN-0042');
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith({
        adminId: 'ADM-001',
        actionType: AuditActionType.UserSuspension,
        resourceId: 'BIN-0042',
      });

      // 4. Date Range filter
      component.handleDateRangeChange({
        from: '2025-06-12',
        to: '2025-06-14',
      });
      expect(auditLogServiceMock.getAuditLogs).toHaveBeenLastCalledWith({
        adminId: 'ADM-001',
        actionType: AuditActionType.UserSuspension,
        resourceId: 'BIN-0042',
        from: '2025-06-12',
        to: '2025-06-14',
      });
    });

    it('should keep admin options stable after filtering by admin', () => {
      // Initial options should contain All admins, ADM-001, and ADM-002
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
          pageSize: 10,
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
      // Page 1 contains first 8 items per p16
      expect(tableText).toContain('Laila Hamdy');
      expect(tableText).toContain('ADM-001');
      expect(tableText).toContain('BIN-0042');
      expect(tableText).toContain('Bin Assignment');
      expect(tableText).toContain('Route rebalancing for Giza');
      expect(tableText).toContain('41.33.12.9');

      expect(tableText).toContain('Amr Shawky');
      expect(tableText).toContain('ADM-002');
      expect(tableText).toContain('BIN-0084');
      expect(tableText).toContain('Threshold tuning for high-traffic site');
      expect(tableText).toContain('Showing 1–8 of 10');
    });
  });

  it('should render error state on load error and reload on retry', () => {
    auditLogServiceMock.getAuditLogs.mockReturnValue(throwError(() => new Error('Server error')));
    component.loadAuditLogs();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-error-state')).toBeTruthy();

    // Successful retry
    auditLogServiceMock.getAuditLogs.mockReturnValue(
      of({
        items: structuredClone(MOCK_AUDIT_LOGS),
        page: 1,
        pageSize: 10,
        totalItems: MOCK_AUDIT_LOGS.length,
        totalPages: 1,
      })
    );
    component.loadAuditLogs();
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.auditLogs().length).toBe(10);
    expect(compiled.querySelector('app-error-state')).toBeFalsy();
    expect(compiled.querySelector('app-data-table')).toBeTruthy();
  });
});
