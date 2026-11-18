import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Recyclers } from './recyclers';
import { RecyclersService } from '@services/user/recyclers.service';
import { ToastService } from '@services/toast/toast.service';
import { AccountStatus } from '@models/user/account-status.enum';
import { RecyclerListItem } from '@models/user/recycler.view-model';
import { MOCK_RECYCLERS } from '@core/mock/data/user/user.mock';
import {
  getRecyclerStatusBadgeVariant,
  getRecyclerStatusLabel,
  RECYCLER_TABLE_ACTIONS,
} from './recyclers.config';

describe('Recyclers Component', () => {
  let component: Recyclers;
  let fixture: ComponentFixture<Recyclers>;
  let recyclersServiceSpy: {
    getRecyclers: ReturnType<typeof vi.fn>;
    suspendRecycler: ReturnType<typeof vi.fn>;
    unsuspendRecycler: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const activeUser = MOCK_RECYCLERS.find((r) => r.status === AccountStatus.Active)!;
  const suspendedUser = MOCK_RECYCLERS.find((r) => r.status === AccountStatus.Suspended)!;
  const bannedUser = MOCK_RECYCLERS.find((r) => r.status === AccountStatus.Banned)!;

  beforeEach(async () => {
    vi.useFakeTimers();

    recyclersServiceSpy = {
      getRecyclers: vi.fn().mockReturnValue(
        of({
          items: MOCK_RECYCLERS,
          page: 1,
          pageSize: 10,
          totalItems: MOCK_RECYCLERS.length,
          totalPages: Math.ceil(MOCK_RECYCLERS.length / 10),
        })
      ),
      suspendRecycler: vi.fn().mockReturnValue(
        of({
          userId: activeUser.userId,
          status: AccountStatus.Suspended,
          suspendedAt: new Date().toISOString(),
        })
      ),
      unsuspendRecycler: vi.fn().mockReturnValue(
        of({
          userId: suspendedUser.userId,
          status: AccountStatus.Active,
          unsuspendedAt: new Date().toISOString(),
        })
      ),
    };

    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Recyclers],
      providers: [
        provideRouter([]),
        { provide: RecyclersService, useValue: recyclersServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Recyclers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and load recyclers on mount via pagedList', () => {
    expect(component).toBeTruthy();
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledTimes(1);
    expect(component.pagedList.items().length).toBe(MOCK_RECYCLERS.length);
    expect(component.pagedList.loading()).toBe(false);
    expect(component.pagedList.error()).toBeNull();
  });

  it('debounces rapid search keystrokes: typing "nour" fires exactly 1 request', () => {
    recyclersServiceSpy.getRecyclers.mockClear();

    component.handleSearch('n');
    vi.advanceTimersByTime(50);
    component.handleSearch('no');
    vi.advanceTimersByTime(50);
    component.handleSearch('nou');
    vi.advanceTimersByTime(50);
    component.handleSearch('nour');

    expect(recyclersServiceSpy.getRecyclers).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledTimes(1);
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'nour',
        page: 1,
      })
    );
  });

  it('handles race conditions: slow first request is cancelled by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    recyclersServiceSpy.getRecyclers.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    component.pagedList.setPage(2);
    component.pagedList.setPage(3);

    fastSubject.next({
      items: [{ ...activeUser, userId: 'usr-fast' }],
      page: 3,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].userId).toBe('usr-fast');

    slowSubject.next({
      items: [{ ...activeUser, userId: 'usr-slow' }],
      page: 2,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    slowSubject.complete();

    expect(component.pagedList.items()[0].userId).toBe('usr-fast');
  });

  it('resets page to 1 on filter changes', () => {
    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleStatusChange(AccountStatus.Suspended);
    expect(component.pagedList.page()).toBe(1);
  });

  it('should open suspend modal with selected user', () => {
    component.handleTableAction({ action: 'suspend', row: activeUser });

    expect(component.isSuspendModalOpen()).toBe(true);
    expect(component.selectedRecycler()).toEqual(activeUser);
    expect(component.suspendForm.controls.reason.value).toBe('');
  });

  it('should submit suspension with mandatory reason and reload pagedList', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.handleTableAction({ action: 'suspend', row: activeUser });

    component.suspendForm.controls.reason.setValue('  Suspected repeated fraudulent drop-offs  ');
    component.confirmSuspend();

    expect(recyclersServiceSpy.suspendRecycler).toHaveBeenCalledWith(
      activeUser.userId,
      'Suspected repeated fraudulent drop-offs'
    );
    expect(toastServiceSpy.success).toHaveBeenCalledWith(
      `Account for ${activeUser.name} suspended successfully`
    );
    expect(component.isSuspendModalOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('rejects empty or whitespace-only suspend reason and limits to 500 characters', () => {
    component.handleTableAction({ action: 'suspend', row: activeUser });
    const reasonCtrl = component.suspendForm.controls.reason;

    reasonCtrl.setValue('   ');
    reasonCtrl.markAsTouched();
    expect(reasonCtrl.invalid).toBe(true);
    expect(reasonCtrl.errors).toHaveProperty('trimmedRequired');
    expect(component.suspendReasonError()).toBe('Reason for suspension is required');

    reasonCtrl.setValue('a'.repeat(501));
    expect(reasonCtrl.invalid).toBe(true);
    expect(reasonCtrl.errors).toHaveProperty('maxLen');
    expect(component.suspendReasonError()).toBe('Reason cannot exceed 500 characters');

    reasonCtrl.setValue('Valid reason');
    expect(reasonCtrl.valid).toBe(true);
    expect(component.suspendReasonError()).toBe('');
  });

  it('should open restore access confirm dialog and unsuspend user on confirmation', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.handleTableAction({ action: 'unsuspend', row: suspendedUser });

    expect(component.isUnsuspendDialogOpen()).toBe(true);
    expect(component.selectedRecycler()).toEqual(suspendedUser);
    expect(component.unsuspendDescription()).toContain(suspendedUser.name);

    component.confirmUnsuspend();

    expect(recyclersServiceSpy.unsuspendRecycler).toHaveBeenCalledWith(suspendedUser.userId);
    expect(toastServiceSpy.success).toHaveBeenCalledWith(
      `Account for ${suspendedUser.name} restored to Active`
    );
    expect(component.isUnsuspendDialogOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should show correct action buttons based on account status', () => {
    const suspendAction = RECYCLER_TABLE_ACTIONS.find((a) => a.id === 'suspend')!;
    const unsuspendAction = RECYCLER_TABLE_ACTIONS.find((a) => a.id === 'unsuspend')!;

    expect(suspendAction.visible?.(activeUser)).toBe(true);
    expect(unsuspendAction.visible?.(activeUser)).toBe(false);

    expect(suspendAction.visible?.(suspendedUser)).toBe(false);
    expect(unsuspendAction.visible?.(suspendedUser)).toBe(true);

    expect(suspendAction.visible?.(bannedUser)).toBe(false);
    expect(unsuspendAction.visible?.(bannedUser)).toBe(false);
  });

  it('should map account status to correct badge variant and label', () => {
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Active)).toBe('success');
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Suspended)).toBe('warning');
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Banned)).toBe('danger');
    expect(getRecyclerStatusBadgeVariant('unknown')).toBe('neutral');

    expect(getRecyclerStatusLabel(AccountStatus.Active)).toBe('Active');
    expect(getRecyclerStatusLabel(AccountStatus.Suspended)).toBe('Suspended');
    expect(getRecyclerStatusLabel(AccountStatus.Banned)).toBe('Banned');
  });
});
