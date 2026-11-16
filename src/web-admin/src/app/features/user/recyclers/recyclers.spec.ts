import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Recyclers } from './recyclers';
import { RecyclersService } from '../../../core/services/user/recyclers.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { AccountStatus } from '../../../core/models/user/account-status.enum';
import { RecyclerListItem } from '../../../core/models/user/recycler.view-model';
import { MOCK_RECYCLERS } from '../../../core/mock/data/user/user.mock';
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
    recyclersServiceSpy = {
      getRecyclers: vi.fn().mockReturnValue(of({
        items: MOCK_RECYCLERS,
        page: 1,
        pageSize: 10,
        totalItems: MOCK_RECYCLERS.length,
        totalPages: Math.ceil(MOCK_RECYCLERS.length / 10),
      })),
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
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load recyclers on mount', () => {
    expect(component).toBeTruthy();
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledTimes(1);
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledWith({});
    expect(component.recyclers().length).toBe(MOCK_RECYCLERS.length);
    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should filter recyclers by search query', () => {
    recyclersServiceSpy.getRecyclers.mockClear();

    component.handleSearch('Nour');
    expect(component.searchTerm()).toBe('Nour');
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledWith({
      search: 'Nour',
    });
  });

  it('should filter recyclers by status', () => {
    recyclersServiceSpy.getRecyclers.mockClear();

    component.handleStatusChange(AccountStatus.Active);
    expect(component.selectedStatus()).toBe(AccountStatus.Active);
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledWith({
      status: AccountStatus.Active,
    });
  });

  it('should combine search query and status in RecyclerQuery', () => {
    recyclersServiceSpy.getRecyclers.mockClear();

    component.searchTerm.set('Ahmed');
    component.handleStatusChange(AccountStatus.Suspended);

    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledWith({
      search: 'Ahmed',
      status: AccountStatus.Suspended,
    });
  });

  it('should configure table actions and enforce visibility and disabled state per status', () => {
    const viewAction = RECYCLER_TABLE_ACTIONS.find((a) => a.id === 'view')!;
    const suspendAction = RECYCLER_TABLE_ACTIONS.find((a) => a.id === 'suspend')!;
    const unsuspendAction = RECYCLER_TABLE_ACTIONS.find((a) => a.id === 'unsuspend')!;

    expect(viewAction).toBeDefined();
    expect(suspendAction).toBeDefined();
    expect(unsuspendAction).toBeDefined();

    // Eye action is always disabled
    expect(viewAction.disabled?.(activeUser)).toBe(true);
    expect(viewAction.disabled?.(suspendedUser)).toBe(true);
    expect(viewAction.disabled?.(bannedUser)).toBe(true);

    // Active row: suspend is visible, unsuspend is hidden
    expect(suspendAction.visible?.(activeUser)).toBe(true);
    expect(unsuspendAction.visible?.(activeUser)).toBe(false);

    // Suspended row: unsuspend is visible, suspend is hidden
    expect(suspendAction.visible?.(suspendedUser)).toBe(false);
    expect(unsuspendAction.visible?.(suspendedUser)).toBe(true);

    // Banned row: neither action is visible
    expect(suspendAction.visible?.(bannedUser)).toBe(false);
    expect(unsuspendAction.visible?.(bannedUser)).toBe(false);
  });

  it('should open suspend modal when suspend action is clicked on active user', () => {
    component.handleTableAction({ action: 'suspend', row: activeUser });

    expect(component.isSuspendModalOpen()).toBe(true);
    expect(component.selectedRecycler()).toEqual(activeUser);
    expect(component.suspendForm.value.reason).toBe('');
    expect(component.suspendForm.invalid).toBe(true);
  });

  it('should validate that suspension reason is required and cannot be whitespace only', () => {
    component.handleTableAction({ action: 'suspend', row: activeUser });

    // Empty reason
    component.confirmSuspend();
    expect(recyclersServiceSpy.suspendRecycler).not.toHaveBeenCalled();

    // Whitespace only
    component.suspendForm.controls.reason.setValue('    ');
    expect(component.suspendForm.invalid).toBe(true);
    component.confirmSuspend();
    expect(recyclersServiceSpy.suspendRecycler).not.toHaveBeenCalled();

    // Valid reason
    component.suspendForm.controls.reason.setValue('Repeated contamination offenses');
    expect(component.suspendForm.valid).toBe(true);
  });

  it('should successfully submit suspend request, toast success, close modal, and reload', () => {
    recyclersServiceSpy.getRecyclers.mockClear();
    component.handleTableAction({ action: 'suspend', row: activeUser });

    component.suspendForm.controls.reason.setValue('Repeated glass in paper bin');
    component.confirmSuspend();

    expect(recyclersServiceSpy.suspendRecycler).toHaveBeenCalledWith(
      activeUser.userId,
      'Repeated glass in paper bin'
    );
    expect(toastServiceSpy.success).toHaveBeenCalledWith(
      `Account for ${activeUser.name} suspended successfully`
    );
    expect(component.isSuspendModalOpen()).toBe(false);
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledTimes(1);
  });

  it('should handle service error during suspension without closing modal', () => {
    recyclersServiceSpy.suspendRecycler.mockReturnValue(
      throwError(() => ({ message: 'Failed to suspend account' }))
    );

    component.handleTableAction({ action: 'suspend', row: activeUser });
    component.suspendForm.controls.reason.setValue('Contamination');
    component.confirmSuspend();

    expect(recyclersServiceSpy.suspendRecycler).toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalled();
    expect(component.isSuspendModalOpen()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });

  it('should open unsuspend confirm dialog and execute unsuspend on confirmation', () => {
    recyclersServiceSpy.getRecyclers.mockClear();
    component.handleTableAction({ action: 'unsuspend', row: suspendedUser });

    expect(component.isUnsuspendDialogOpen()).toBe(true);
    expect(component.selectedRecycler()).toEqual(suspendedUser);
    expect(component.unsuspendDescription()).toContain(suspendedUser.name);

    component.confirmUnsuspend();

    expect(recyclersServiceSpy.unsuspendRecycler).toHaveBeenCalledWith(suspendedUser.userId);
    expect(toastServiceSpy.success).toHaveBeenCalledWith(
      `Account for ${suspendedUser.name} unsuspended successfully`
    );
    expect(component.isUnsuspendDialogOpen()).toBe(false);
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledTimes(1);
  });

  it('should handle service error during unsuspend and show toast error', () => {
    recyclersServiceSpy.unsuspendRecycler.mockReturnValue(
      throwError(() => ({ message: 'Network failure' }))
    );

    component.handleTableAction({ action: 'unsuspend', row: suspendedUser });
    component.confirmUnsuspend();

    expect(recyclersServiceSpy.unsuspendRecycler).toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
  });

  it('should close modals on cancel without calling services', () => {
    // Suspend cancel
    component.handleTableAction({ action: 'suspend', row: activeUser });
    component.closeSuspendModal();
    expect(component.isSuspendModalOpen()).toBe(false);
    expect(component.selectedRecycler()).toBeNull();
    expect(recyclersServiceSpy.suspendRecycler).not.toHaveBeenCalled();

    // Unsuspend cancel
    component.handleTableAction({ action: 'unsuspend', row: suspendedUser });
    component.closeUnsuspendDialog();
    expect(component.isUnsuspendDialogOpen()).toBe(false);
    expect(component.selectedRecycler()).toBeNull();
    expect(recyclersServiceSpy.unsuspendRecycler).not.toHaveBeenCalled();
  });

  it('should render error state on initial load failure and retry successfully', () => {
    recyclersServiceSpy.getRecyclers.mockReturnValueOnce(
      throwError(() => ({ message: 'Server unavailable' }))
    );

    component.loadRecyclers();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    // Now retry
    recyclersServiceSpy.getRecyclers.mockReturnValueOnce(
      of({
        items: MOCK_RECYCLERS,
        page: 1,
        pageSize: 10,
        totalItems: MOCK_RECYCLERS.length,
        totalPages: 1,
      })
    );
    component.loadRecyclers();

    expect(component.error()).toBeNull();
    expect(component.recyclers().length).toBe(MOCK_RECYCLERS.length);
  });

  it('should map AccountStatus to expected badge variants and labels', () => {
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Active)).toBe('success');
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Suspended)).toBe('warning');
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Banned)).toBe('danger');
    expect(getRecyclerStatusBadgeVariant(AccountStatus.Inactive)).toBe('neutral');

    expect(getRecyclerStatusLabel(AccountStatus.Active)).toBe('Active');
    expect(getRecyclerStatusLabel(AccountStatus.Suspended)).toBe('Suspended');
    expect(getRecyclerStatusLabel(AccountStatus.Banned)).toBe('Banned');
    expect(getRecyclerStatusLabel('unknown')).toBe('unknown');
  });
});
