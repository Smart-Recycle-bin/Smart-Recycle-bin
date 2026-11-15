import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Collectors } from './collectors';
import { CollectorsService } from '../../../core/services/collector/collectors.service';
import { BinsService } from '../../../core/services/bin/bins.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { AccountStatus } from '../../../core/models/user/account-status.enum';
import { CollectorCredentialsMode } from '../../../core/models/collector/collector-credentials-mode.enum';
import { CollectorAssignedBin, CollectorListItem } from '../../../core/models/collector/collector.view-model';
import { BinStatus } from '../../../core/models/bin/bin-status.enum';
import { ApiErrorCode } from '../../../core/models/common/api-error-code.enum';
import { ApiError } from '../../../core/errors/api-error';
import { MOCK_COLLECTORS } from '../../../core/mock/data/collector/collector.mock';
import { MOCK_BINS } from '../../../core/mock/data/bin/bin.mock';
import {
  COLLECTOR_TABLE_ACTIONS,
  getCollectorStatusBadgeVariant,
  getCollectorStatusLabel,
} from './collectors.config';

describe('Collectors Component', () => {
  let component: Collectors;
  let fixture: ComponentFixture<Collectors>;
  let collectorsServiceSpy: {
    getCollectors: ReturnType<typeof vi.fn>;
    createCollector: ReturnType<typeof vi.fn>;
    updateCollector: ReturnType<typeof vi.fn>;
    getAssignedBins: ReturnType<typeof vi.fn>;
    deactivateCollector: ReturnType<typeof vi.fn>;
  };
  let binsServiceSpy: {
    getBins: ReturnType<typeof vi.fn>;
    assignCollector: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const activeCollector = MOCK_COLLECTORS.find((c) => c.status === AccountStatus.Active)!;
  const inactiveCollector = MOCK_COLLECTORS.find((c) => c.status === AccountStatus.Inactive)!;

  const sampleAssignedBins: CollectorAssignedBin[] = [
    {
      binId: 'BIN-1001',
      name: 'Tahrir Square Central',
      area: 'Tahrir Square',
      district: 'Cairo',
      fillLevel: 88,
      status: BinStatus.EightyPercentFull,
      lastServicedAt: '2025-06-14 09:42',
    },
  ];

  beforeEach(async () => {
    collectorsServiceSpy = {
      getCollectors: vi.fn().mockReturnValue(of(MOCK_COLLECTORS)),
      createCollector: vi.fn().mockReturnValue(
        of({
          userId: 'col_new',
          displayName: 'New Collector',
          email: 'new@ecobin.eg',
          role: 'OPS_COLLECTOR',
          createdAt: new Date().toISOString(),
        })
      ),
      updateCollector: vi.fn().mockReturnValue(
        of({
          ...activeCollector,
          name: 'Updated Name',
        })
      ),
      getAssignedBins: vi.fn().mockReturnValue(of(sampleAssignedBins)),
      deactivateCollector: vi.fn().mockReturnValue(
        of({
          collectorId: activeCollector.collectorId,
          status: AccountStatus.Inactive,
          deactivatedAt: new Date().toISOString(),
        })
      ),
    };

    binsServiceSpy = {
      getBins: vi.fn().mockReturnValue(of(MOCK_BINS)),
      assignCollector: vi.fn().mockReturnValue(
        of({
          binId: 'BIN-1001',
          assignedCollectorId: activeCollector.collectorId,
          assignedAt: new Date().toISOString(),
        })
      ),
    };

    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Collectors],
      providers: [
        provideRouter([]),
        { provide: CollectorsService, useValue: collectorsServiceSpy },
        { provide: BinsService, useValue: binsServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Collectors);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load collectors on mount', () => {
    expect(component).toBeTruthy();
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
    expect(component.collectors().length).toBe(MOCK_COLLECTORS.length);
    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should filter collectors by search query', () => {
    collectorsServiceSpy.getCollectors.mockClear();

    component.handleSearch('Mahmoud');
    expect(component.searchTerm()).toBe('Mahmoud');
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledWith({
      search: 'Mahmoud',
    });
  });

  it('should open create drawer with default invite link credentials mode', () => {
    component.openCreateDrawer();

    expect(component.isCreateDrawerOpen()).toBe(true);
    expect(component.createCredentialsMode()).toBe(CollectorCredentialsMode.InviteLink);
    expect(component.createForm.controls.temporaryPassword.validator).toBeNull();
    expect(component.createForm.valid).toBe(false);
  });

  it('should switch credentials mode to temporary password and validate required password field', () => {
    component.openCreateDrawer();
    component.handleCredentialsModeChange(CollectorCredentialsMode.TemporaryPassword);

    expect(component.createCredentialsMode()).toBe(CollectorCredentialsMode.TemporaryPassword);
    expect(component.createForm.controls.temporaryPassword.hasError('required')).toBe(true);

    component.createForm.controls.temporaryPassword.setValue('TempPass123!');
    expect(component.createForm.controls.temporaryPassword.valid).toBe(true);

    // Switch back to invite link
    component.handleCredentialsModeChange(CollectorCredentialsMode.InviteLink);
    expect(component.createCredentialsMode()).toBe(CollectorCredentialsMode.InviteLink);
    expect(component.createForm.controls.temporaryPassword.validator).toBeNull();
  });

  it('should submit create collector request with invite link mode', () => {
    collectorsServiceSpy.getCollectors.mockClear();
    component.openCreateDrawer();

    component.createForm.setValue({
      displayName: 'Yasser Arafat',
      email: 'y.arafat@ecobin.eg',
      phoneNumber: '+20 100 111 2222',
      temporaryPassword: '',
      district: 'Cairo',
    });

    component.submitCreate();

    expect(collectorsServiceSpy.createCollector).toHaveBeenCalledWith({
      displayName: 'Yasser Arafat',
      email: 'y.arafat@ecobin.eg',
      phoneNumber: '+20 100 111 2222',
      district: 'Cairo',
      credentialsMode: CollectorCredentialsMode.InviteLink,
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isCreateDrawerOpen()).toBe(false);
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
  });

  it('should submit create collector request with temporary password mode', () => {
    component.openCreateDrawer();
    component.handleCredentialsModeChange(CollectorCredentialsMode.TemporaryPassword);

    component.createForm.setValue({
      displayName: 'Tamer Hosny',
      email: 't.hosny@ecobin.eg',
      phoneNumber: '+20 100 333 4444',
      temporaryPassword: 'SecretPassword99!',
      district: 'Giza',
    });

    component.submitCreate();

    expect(collectorsServiceSpy.createCollector).toHaveBeenCalledWith({
      displayName: 'Tamer Hosny',
      email: 't.hosny@ecobin.eg',
      phoneNumber: '+20 100 333 4444',
      temporaryPassword: 'SecretPassword99!',
      district: 'Giza',
      credentialsMode: CollectorCredentialsMode.TemporaryPassword,
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isCreateDrawerOpen()).toBe(false);
  });

  it('should map EMAIL_ALREADY_EXISTS error to email form control', () => {
    const error409 = new ApiError({
      message: 'Email already exists',
      code: ApiErrorCode.EmailAlreadyExists,
      status: 409,
      requestUrl: '/api/v1/admin/collectors',
    });
    collectorsServiceSpy.createCollector.mockReturnValue(throwError(() => error409));

    component.openCreateDrawer();
    component.createForm.setValue({
      displayName: 'Duplicate User',
      email: 'existing@ecobin.eg',
      phoneNumber: '+20 100 999 8888',
      temporaryPassword: '',
      district: 'Cairo',
    });

    component.submitCreate();

    expect(component.createForm.controls.email.hasError('emailAlreadyExists')).toBe(true);
    expect(component.createEmailError()).toBe('This email address is already registered');
    expect(component.isCreateDrawerOpen()).toBe(true);
  });

  it('should open edit drawer with prefilled values and submit update', () => {
    collectorsServiceSpy.getCollectors.mockClear();

    component.handleTableAction({ action: 'edit', row: activeCollector });

    expect(component.isEditDrawerOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);
    expect(component.editForm.value.displayName).toBe(activeCollector.name);
    expect(component.editForm.value.email).toBe(activeCollector.email);
    expect(component.editForm.value.district).toBe(activeCollector.district);

    component.editForm.controls.displayName.setValue('Mahmoud Fathy Updated');
    component.submitEdit();

    expect(collectorsServiceSpy.updateCollector).toHaveBeenCalledWith(
      activeCollector.collectorId,
      {
        displayName: 'Mahmoud Fathy Updated',
        email: activeCollector.email,
        phoneNumber: activeCollector.phone,
        district: activeCollector.district,
      }
    );
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isEditDrawerOpen()).toBe(false);
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
  });

  it('should open assigned-bins drawer and load assigned bins for collector', () => {
    component.openAssignedBinsDrawer(activeCollector);

    expect(component.isAssignedBinsDrawerOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);
    expect(collectorsServiceSpy.getAssignedBins).toHaveBeenCalledWith(activeCollector.collectorId);
    expect(component.assignedBins()).toEqual(sampleAssignedBins);
    expect(component.isLoadingAssignedBins()).toBe(false);

    component.closeAssignedBinsDrawer();
    expect(component.isAssignedBinsDrawerOpen()).toBe(false);
    expect(component.assignedBins()).toEqual([]);
  });

  it('should open assign bin modal, load bins from BinsService, and assign collector', () => {
    collectorsServiceSpy.getCollectors.mockClear();

    component.handleTableAction({ action: 'assign', row: activeCollector });

    expect(component.isAssignModalOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);
    expect(binsServiceSpy.getBins).toHaveBeenCalledTimes(1);
    expect(component.availableBins().length).toBe(MOCK_BINS.length);

    component.assignBinForm.controls.binId.setValue('BIN-1001');
    component.submitAssign();

    expect(binsServiceSpy.assignCollector).toHaveBeenCalledWith('BIN-1001', {
      collectorId: activeCollector.collectorId,
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isAssignModalOpen()).toBe(false);
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
  });

  it('should open deactivate confirm dialog and deactivate collector on confirmation', () => {
    collectorsServiceSpy.getCollectors.mockClear();

    component.handleTableAction({ action: 'deactivate', row: activeCollector });

    expect(component.isDeactivateDialogOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);
    expect(component.deactivateDescription()).toContain(activeCollector.name);

    component.confirmDeactivate();

    expect(collectorsServiceSpy.deactivateCollector).toHaveBeenCalledWith(activeCollector.collectorId);
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isDeactivateDialogOpen()).toBe(false);
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
  });

  it('should hide deactivate action for inactive collectors', () => {
    const deactivateAction = COLLECTOR_TABLE_ACTIONS.find((a) => a.id === 'deactivate')!;
    expect(deactivateAction).toBeDefined();

    expect(deactivateAction.visible?.(activeCollector)).toBe(true);
    expect(deactivateAction.visible?.(inactiveCollector)).toBe(false);
  });

  it('should render error state on initial load failure and retry successfully', () => {
    collectorsServiceSpy.getCollectors.mockReturnValueOnce(
      throwError(() => ({ message: 'Network error' }))
    );

    component.loadCollectors();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    collectorsServiceSpy.getCollectors.mockReturnValueOnce(of(MOCK_COLLECTORS));
    component.loadCollectors();

    expect(component.error()).toBeNull();
    expect(component.collectors().length).toBe(MOCK_COLLECTORS.length);
  });

  it('should map AccountStatus to expected badge variants and labels', () => {
    expect(getCollectorStatusBadgeVariant(AccountStatus.Active)).toBe('success');
    expect(getCollectorStatusBadgeVariant(AccountStatus.Inactive)).toBe('neutral');

    expect(getCollectorStatusLabel(AccountStatus.Active)).toBe('Active');
    expect(getCollectorStatusLabel(AccountStatus.Inactive)).toBe('Inactive');
    expect(getCollectorStatusLabel('unknown')).toBe('unknown');
  });
});
