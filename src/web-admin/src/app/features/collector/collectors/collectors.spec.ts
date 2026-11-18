import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Collectors } from './collectors';
import { CollectorsService } from '@services/collector/collectors.service';
import { BinsService } from '@services/bin/bins.service';
import { LookupsService } from '@services/lookup/lookups.service';
import { ToastService } from '@services/toast/toast.service';
import { AccountStatus } from '@models/user/account-status.enum';
import { CollectorCredentialsMode } from '@models/collector/collector-credentials-mode.enum';
import { CollectorAssignedBin, CollectorListItem } from '@models/collector/collector.view-model';
import { BinStatus } from '@models/bin/bin-status.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { ApiError } from '@core/errors/api-error';
import { MOCK_COLLECTORS } from '@core/mock/data/collector/collector.mock';
import { MOCK_BINS } from '@core/mock/data/bin/bin.mock';
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
  let lookupsServiceSpy: {
    getDistricts: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
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
    vi.useFakeTimers();

    collectorsServiceSpy = {
      getCollectors: vi.fn().mockReturnValue(
        of({
          items: MOCK_COLLECTORS,
          page: 1,
          pageSize: 10,
          totalItems: MOCK_COLLECTORS.length,
          totalPages: Math.ceil(MOCK_COLLECTORS.length / 10),
        })
      ),
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
      getBins: vi.fn().mockReturnValue(
        of({
          items: MOCK_BINS,
          page: 1,
          pageSize: 10,
          totalItems: MOCK_BINS.length,
          totalPages: Math.ceil(MOCK_BINS.length / 10),
        })
      ),
      assignCollector: vi.fn().mockReturnValue(
        of({
          binId: 'BIN-1001',
          collectorId: activeCollector.collectorId,
          assignedAt: new Date().toISOString(),
        })
      ),
    };

    lookupsServiceSpy = {
      getDistricts: vi.fn().mockReturnValue(
        of([
          { name: 'Cairo', region: 'Cairo Central' },
          { name: 'Giza', region: 'Giza' },
        ])
      ),
      invalidate: vi.fn(),
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
        { provide: LookupsService, useValue: lookupsServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Collectors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and load collectors on mount via pagedList', () => {
    expect(component).toBeTruthy();
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
    expect(component.pagedList.items().length).toBe(MOCK_COLLECTORS.length);
    expect(component.pagedList.loading()).toBe(false);
  });

  it('debounces rapid search keystrokes: typing "mahmoud" fires exactly 1 request', () => {
    collectorsServiceSpy.getCollectors.mockClear();

    component.handleSearch('m');
    vi.advanceTimersByTime(50);
    component.handleSearch('mah');
    vi.advanceTimersByTime(50);
    component.handleSearch('mahmoud');

    expect(collectorsServiceSpy.getCollectors).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledTimes(1);
    expect(collectorsServiceSpy.getCollectors).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'mahmoud',
        page: 1,
      })
    );
  });

  it('handles race conditions: slow first request is cancelled by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    collectorsServiceSpy.getCollectors.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    component.pagedList.setPage(2);
    component.pagedList.setPage(3);

    fastSubject.next({
      items: [{ ...activeCollector, collectorId: 'col-fast' }],
      page: 3,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].collectorId).toBe('col-fast');

    slowSubject.next({
      items: [{ ...activeCollector, collectorId: 'col-slow' }],
      page: 2,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    slowSubject.complete();

    expect(component.pagedList.items()[0].collectorId).toBe('col-fast');
  });

  it('should open create drawer with default InviteLink credentials mode', () => {
    component.openCreateDrawer();

    expect(component.isCreateDrawerOpen()).toBe(true);
    expect(component.createCredentialsMode()).toBe(CollectorCredentialsMode.InviteLink);
    expect(component.createForm.controls.temporaryPassword.validator).toBeNull();
  });

  it('should toggle temporary password validation when switching credentials mode', () => {
    component.openCreateDrawer();

    component.handleCredentialsModeChange(CollectorCredentialsMode.TemporaryPassword);
    expect(component.createCredentialsMode()).toBe(CollectorCredentialsMode.TemporaryPassword);

    const passwordControl = component.createForm.controls.temporaryPassword;
    passwordControl.setValue('');
    expect(passwordControl.valid).toBe(false);
    expect(passwordControl.errors).toHaveProperty('trimmedRequired');

    passwordControl.setValue('abc');
    expect(passwordControl.valid).toBe(false);
    expect(passwordControl.errors).toHaveProperty('strongTempPassword');

    passwordControl.setValue('Pass1234');
    expect(passwordControl.valid).toBe(true);

    component.handleCredentialsModeChange(CollectorCredentialsMode.InviteLink);
    expect(component.createCredentialsMode()).toBe(CollectorCredentialsMode.InviteLink);
    expect(passwordControl.valid).toBe(true);
  });

  it('validates phone and name max length', () => {
    component.openCreateDrawer();
    const phoneCtrl = component.createForm.controls.phoneNumber;
    phoneCtrl.setValue('12345');
    expect(phoneCtrl.valid).toBe(false);
    expect(phoneCtrl.errors).toHaveProperty('phone');

    phoneCtrl.setValue('+20 100 123 4567');
    expect(phoneCtrl.valid).toBe(true);

    const nameCtrl = component.createForm.controls.displayName;
    nameCtrl.setValue('a'.repeat(101));
    expect(nameCtrl.valid).toBe(false);
    expect(nameCtrl.errors).toHaveProperty('maxLen');
  });

  it('should successfully submit create form, reload pagedList, and invalidate collectors lookup', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.openCreateDrawer();
    component.createForm.setValue({
      displayName: '  Tarek Nour  ',
      email: 'tarek@ecobin.eg',
      phoneNumber: '  +20 100 999 8877  ',
      temporaryPassword: '',
      district: 'Giza',
    });

    component.submitCreate();

    expect(collectorsServiceSpy.createCollector).toHaveBeenCalledWith({
      displayName: 'Tarek Nour',
      email: 'tarek@ecobin.eg',
      phoneNumber: '+20 100 999 8877',
      district: 'Giza',
      credentialsMode: CollectorCredentialsMode.InviteLink,
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isCreateDrawerOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
    expect(lookupsServiceSpy.invalidate).toHaveBeenCalledWith('collectors');
  });

  it('should handle duplicate email conflict error on collector creation', () => {
    const duplicateError = new ApiError({
      status: 409,
      code: ApiErrorCode.EmailAlreadyExists,
      message: 'This email address is already registered',
      requestUrl: '/api/v1/admin/collectors',
    });
    collectorsServiceSpy.createCollector.mockReturnValueOnce(throwError(() => duplicateError));

    component.openCreateDrawer();
    component.createForm.setValue({
      displayName: 'Duplicate User',
      email: 'duplicate@ecobin.eg',
      phoneNumber: '+20 100 000 0000',
      temporaryPassword: '',
      district: 'Cairo',
    });

    component.submitCreate();

    expect(component.isSubmitting()).toBe(false);
    expect(component.createForm.controls.email.errors).toEqual({ emailAlreadyExists: true });
    expect(component.emailServerError()).toBe('This email address is already registered');
  });

  it('maps server field errors to form controls on collector creation', () => {
    const errorResponse = {
      status: 400,
      error: {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ field: 'phoneNumber', message: 'Phone number already in use' }],
      },
    };
    collectorsServiceSpy.createCollector.mockReturnValueOnce(throwError(() => errorResponse));

    component.openCreateDrawer();
    component.createForm.setValue({
      displayName: 'Ali',
      email: 'ali@ecobin.eg',
      phoneNumber: '+20 100 111 2222',
      temporaryPassword: '',
      district: 'Cairo',
    });

    component.submitCreate();

    expect(component.createForm.controls.phoneNumber.errors).toEqual({
      serverError: 'Phone number already in use',
    });
  });

  it('should open edit drawer and submit updated collector details', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.handleTableAction({ action: 'edit', row: activeCollector });

    expect(component.isEditDrawerOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);
    expect(component.editForm.controls.displayName.value).toBe(activeCollector.name);

    component.editForm.controls.displayName.setValue('Updated Collector Name');
    component.submitEdit();

    expect(collectorsServiceSpy.updateCollector).toHaveBeenCalledWith(activeCollector.collectorId, {
      displayName: 'Updated Collector Name',
      email: activeCollector.email,
      phoneNumber: activeCollector.phone,
      district: activeCollector.district,
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isEditDrawerOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
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

  it('should open assign bin modal and fetchAvailableBins searches BinsService with pageSize 20 excluding already assigned', () => {
    binsServiceSpy.getBins.mockReturnValue(
      of({
        items: [
          { binId: 'BIN-1001', name: 'Bin 1', collectorId: activeCollector.collectorId, district: 'Cairo', fillLevel: 50 },
          { binId: 'BIN-1002', name: 'Bin 2', collectorId: 'other-col', district: 'Giza', fillLevel: 30 },
        ],
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      })
    );

    component.handleTableAction({ action: 'assign', row: activeCollector });

    expect(component.isAssignModalOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);

    // Call fetchAvailableBins
    let resultOptions: any[] = [];
    component.fetchAvailableBins('term').subscribe((opts) => {
      resultOptions = opts;
    });

    expect(binsServiceSpy.getBins).toHaveBeenCalledWith({ search: 'term', pageSize: 50 });
    // BIN-1001 had collectorId == activeCollector.collectorId, so it must be excluded!
    expect(resultOptions.length).toBe(1);
    expect(resultOptions[0].value).toBe('BIN-1002');
  });

  it('submits assign bin and reloads pagedList', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.handleTableAction({ action: 'assign', row: activeCollector });
    component.assignBinForm.controls.binId.setValue('BIN-1002');
    component.submitAssign();

    expect(binsServiceSpy.assignCollector).toHaveBeenCalledWith('BIN-1002', {
      collectorId: activeCollector.collectorId,
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isAssignModalOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should open deactivate confirm dialog and deactivate collector on confirmation', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.handleTableAction({ action: 'deactivate', row: activeCollector });

    expect(component.isDeactivateDialogOpen()).toBe(true);
    expect(component.selectedCollector()).toEqual(activeCollector);
    expect(component.deactivateDescription()).toContain(activeCollector.name);

    component.confirmDeactivate();

    expect(collectorsServiceSpy.deactivateCollector).toHaveBeenCalledWith(activeCollector.collectorId);
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isDeactivateDialogOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should hide deactivate action for inactive collectors', () => {
    const deactivateAction = COLLECTOR_TABLE_ACTIONS.find((a) => a.id === 'deactivate')!;
    expect(deactivateAction).toBeDefined();

    expect(deactivateAction.visible?.(activeCollector)).toBe(true);
    expect(deactivateAction.visible?.(inactiveCollector)).toBe(false);
  });
});
