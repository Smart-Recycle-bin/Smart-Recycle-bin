import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BinsList } from './bins-list';
import { BinsService } from '@services/bin/bins.service';
import { LookupsService } from '@services/lookup/lookups.service';
import { ToastService } from '@services/toast/toast.service';
import { BinStatus } from '@models/bin/bin-status.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { ApiError } from '@core/errors/api-error';
import { MOCK_BINS } from '@core/mock/data/bin/bin.mock';

describe('BinsList Component', () => {
  let component: BinsList;
  let fixture: ComponentFixture<BinsList>;
  let binsServiceSpy: {
    getBins: ReturnType<typeof vi.fn>;
    registerBin: ReturnType<typeof vi.fn>;
  };
  let lookupsServiceSpy: {
    getDistricts: ReturnType<typeof vi.fn>;
    getCollectors: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();

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
      registerBin: vi.fn().mockReturnValue(
        of({
          binId: 'BIN-9999',
          deviceSerial: 'SN-99999',
          status: BinStatus.Available,
          fillLevel: 0,
        })
      ),
    };

    lookupsServiceSpy = {
      getDistricts: vi.fn().mockReturnValue(
        of([
          { name: 'Downtown', region: 'Cairo Central' },
          { name: 'Zamalek', region: 'Cairo West' },
          { name: 'Nasr City', region: 'Cairo East' },
        ])
      ),
      getCollectors: vi.fn().mockReturnValue(
        of([{ collectorId: 'col-1', displayName: 'Ahmed Hassan' }])
      ),
      invalidate: vi.fn(),
    };

    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BinsList],
      providers: [
        provideRouter([]),
        { provide: BinsService, useValue: binsServiceSpy },
        { provide: LookupsService, useValue: lookupsServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BinsList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and load bins on mount via pagedList', () => {
    expect(component).toBeTruthy();
    expect(binsServiceSpy.getBins).toHaveBeenCalledTimes(1);
    expect(component.pagedList.items().length).toBe(MOCK_BINS.length);
    expect(component.pagedList.loading()).toBe(false);
  });

  it('should compute derived header subtitle with total bins and districts count from lookups', () => {
    const expected = `${MOCK_BINS.length} registered smart bins across 3 districts`;
    expect(component.headerSubtitle()).toBe(expected);
  });

  it('debounces rapid search keystrokes: typing "nasr" fires exactly 1 request', () => {
    binsServiceSpy.getBins.mockClear();

    // Type rapidly
    component.handleSearch('n');
    vi.advanceTimersByTime(50);
    component.handleSearch('na');
    vi.advanceTimersByTime(50);
    component.handleSearch('nas');
    vi.advanceTimersByTime(50);
    component.handleSearch('nasr');

    expect(binsServiceSpy.getBins).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(binsServiceSpy.getBins).toHaveBeenCalledTimes(1);
    expect(binsServiceSpy.getBins).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'nasr',
        page: 1,
      })
    );
  });

  it('handles race conditions: slow first request is superseded by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    binsServiceSpy.getBins.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    // Fire first request
    component.pagedList.setPage(2);
    // Fire second request immediately
    component.pagedList.setPage(3);

    // Fast second request finishes first
    fastSubject.next({
      items: [{ id: 'fast-3', binId: 'BIN-3333', name: 'Bin 3' }],
      page: 3,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].binId).toBe('BIN-3333');

    // Slow first request finishes later
    slowSubject.next({
      items: [{ id: 'slow-2', binId: 'BIN-2222', name: 'Bin 2' }],
      page: 2,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    slowSubject.complete();

    // Must still retain fast request result!
    expect(component.pagedList.items()[0].binId).toBe('BIN-3333');
  });

  it('resets page to 1 on filter changes', () => {
    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleDistrictChange('Zamalek');
    expect(component.pagedList.page()).toBe(1);

    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleStatusChange(BinStatus.NeedsServicing);
    expect(component.pagedList.page()).toBe(1);
  });

  it('invalidates districts lookup and reloads paged list upon successful bin registration', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: 'SN-77788',
      district: 'Heliopolis',
      latitude: 30.08,
      longitude: 31.32,
      capacityThresholdKg: 120,
    });

    component.submitRegisterBin();

    expect(binsServiceSpy.registerBin).toHaveBeenCalled();
    expect(toastServiceSpy.success).toHaveBeenCalledWith('Smart bin registered successfully.');
    expect(component.isDrawerOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
    expect(lookupsServiceSpy.invalidate).toHaveBeenCalledWith('districts');
  });

  it('handles duplicate device serial registration error', () => {
    const duplicateError = new ApiError({
      status: 409,
      code: ApiErrorCode.DeviceAlreadyRegistered,
      message: 'A bin with this device serial is already registered.',
      requestUrl: '/api/v1/admin/bins',
    });
    binsServiceSpy.registerBin.mockReturnValueOnce(throwError(() => duplicateError));

    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: 'SN-DUPLICATE',
      district: 'Dokki',
      latitude: 30.04,
      longitude: 31.21,
      capacityThresholdKg: 120,
    });

    component.submitRegisterBin();

    expect(component.isSubmitting()).toBe(false);
    expect(component.serialServerError()).toBe(
      'A bin with this device serial is already registered.'
    );
    expect(component.registerForm.controls.deviceSerial.errors).toEqual({ duplicate: true });
  });

  it('rejects invalid inputs (whitespace serial, lat 999, lng -500, capacity 0)', () => {
    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: '   ',
      district: '',
      latitude: 999,
      longitude: -500,
      capacityThresholdKg: 0,
    });

    expect(component.registerForm.invalid).toBe(true);
    expect(component.registerForm.controls.deviceSerial.errors).toHaveProperty('trimmedRequired');
    expect(component.registerForm.controls.district.errors).toHaveProperty('trimmedRequired');
    expect(component.registerForm.controls.latitude.errors).toEqual({ latitude: true });
    expect(component.registerForm.controls.longitude.errors).toEqual({ longitude: true });
    expect(component.registerForm.controls.capacityThresholdKg.errors).toEqual({ positiveInt: true });

    component.submitRegisterBin();
    expect(binsServiceSpy.registerBin).not.toHaveBeenCalled();
  });

  it('trims string inputs in payload before submitting', () => {
    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: '  SN-SPACED-123  ',
      district: '  Maadi  ',
      latitude: 29.96,
      longitude: 31.25,
      capacityThresholdKg: 150,
    });

    component.submitRegisterBin();

    expect(binsServiceSpy.registerBin).toHaveBeenCalledWith({
      deviceSerial: 'SN-SPACED-123',
      district: 'Maadi',
      latitude: 29.96,
      longitude: 31.25,
      capacityThresholdKg: 150,
    });
  });

  it('maps server validation field errors onto form controls', () => {
    const serverValidationError = new ApiError({
      status: 400,
      code: ApiErrorCode.ValidationError,
      message: 'Validation failed',
      details: [
        { field: 'latitude', message: 'Latitude is out of service boundary' },
      ],
      requestUrl: '/api/v1/admin/bins',
    });
    binsServiceSpy.registerBin.mockReturnValueOnce(throwError(() => serverValidationError));

    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: 'SN-BOUNDARY',
      district: 'Giza',
      latitude: 35.0,
      longitude: 31.0,
      capacityThresholdKg: 120,
    });

    component.submitRegisterBin();

    expect(component.registerForm.controls.latitude.errors).toEqual({
      serverError: 'Latitude is out of service boundary',
    });
  });
});
