import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BinsList } from './bins-list';
import { BinsService } from '../../../core/services/bin/bins.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { BinStatus } from '../../../core/models/bin/bin-status.enum';
import { ApiErrorCode } from '../../../core/models/common/api-error-code.enum';
import { ApiError } from '../../../core/errors/api-error';
import { MOCK_BINS } from '../../../core/mock/data/bin/bin.mock';
import { getBinStatusBadgeVariant } from './bins-list.config';

describe('BinsList Component', () => {
  let component: BinsList;
  let fixture: ComponentFixture<BinsList>;
  let binsServiceSpy: {
    getBins: ReturnType<typeof vi.fn>;
    registerBin: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    binsServiceSpy = {
      getBins: vi.fn().mockReturnValue(of({
        items: MOCK_BINS,
        page: 1,
        pageSize: 10,
        totalItems: MOCK_BINS.length,
        totalPages: Math.ceil(MOCK_BINS.length / 10),
      })),
      registerBin: vi.fn().mockReturnValue(of({
        binId: 'BIN-9999',
        deviceSerial: 'SN-99999',
        status: BinStatus.Available,
        fillLevel: 0,
      })),
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
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BinsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load bins on mount', () => {
    expect(component).toBeTruthy();
    expect(binsServiceSpy.getBins).toHaveBeenCalledTimes(1);
    expect(component.bins().length).toBe(MOCK_BINS.length);
    expect(component.allBins().length).toBe(MOCK_BINS.length);
    expect(component.isLoading()).toBe(false);
  });

  it('should compute derived header subtitle with total bins and districts count', () => {
    const uniqueDistricts = new Set(MOCK_BINS.map((b) => b.district)).size;
    const expected = `${MOCK_BINS.length} registered smart bins across ${uniqueDistricts} districts`;
    expect(component.headerSubtitle()).toBe(expected);
  });

  it('should filter bins by search query', () => {
    binsServiceSpy.getBins.mockClear();

    component.handleSearch('Tahrir');
    expect(component.searchTerm()).toBe('Tahrir');
    expect(binsServiceSpy.getBins).toHaveBeenCalledWith({
      search: 'Tahrir',
    });
  });

  it('should filter bins by district', () => {
    binsServiceSpy.getBins.mockClear();

    component.handleDistrictChange('Cairo');
    expect(component.selectedDistrict()).toBe('Cairo');
    expect(binsServiceSpy.getBins).toHaveBeenCalledWith({
      district: 'Cairo',
    });
  });

  it('should filter bins by status', () => {
    binsServiceSpy.getBins.mockClear();

    component.handleStatusChange(BinStatus.NeedsServicing);
    expect(component.selectedStatus()).toBe(BinStatus.NeedsServicing);
    expect(binsServiceSpy.getBins).toHaveBeenCalledWith({
      status: BinStatus.NeedsServicing,
    });
  });

  it('should filter bins by collector', () => {
    binsServiceSpy.getBins.mockClear();

    component.handleCollectorChange('C-001');
    expect(component.selectedCollector()).toBe('C-001');
    expect(binsServiceSpy.getBins).toHaveBeenCalledWith({
      collectorId: 'C-001',
    });
  });

  it('should combine multiple filters in BinQuery', () => {
    binsServiceSpy.getBins.mockClear();

    component.searchTerm.set('Mall');
    component.selectedDistrict.set('Cairo');
    component.selectedStatus.set(BinStatus.Available);
    component.selectedCollector.set('C-001');

    component.loadBins();

    expect(binsServiceSpy.getBins).toHaveBeenCalledWith({
      search: 'Mall',
      district: 'Cairo',
      status: BinStatus.Available,
      collectorId: 'C-001',
    });
  });

  it('should map BinStatus to correct badge variants', () => {
    expect(getBinStatusBadgeVariant(BinStatus.Available)).toBe('success');
    expect(getBinStatusBadgeVariant(BinStatus.EightyPercentFull)).toBe('warning');
    expect(getBinStatusBadgeVariant(BinStatus.NeedsServicing)).toBe('danger');
    expect(getBinStatusBadgeVariant(BinStatus.Offline)).toBe('neutral');
  });

  it('should handle register drawer open and close', () => {
    expect(component.isDrawerOpen()).toBe(false);

    component.openRegisterDrawer();
    expect(component.isDrawerOpen()).toBe(true);
    expect(component.registerForm.value.capacityThresholdKg).toBe(120);

    component.closeRegisterDrawer();
    expect(component.isDrawerOpen()).toBe(false);
  });

  it('should validate form and prevent submission when fields are empty', () => {
    component.openRegisterDrawer();
    component.submitRegisterBin();

    expect(binsServiceSpy.registerBin).not.toHaveBeenCalled();
    expect(component.registerForm.controls.deviceSerial.touched).toBe(true);
    expect(component.registerForm.controls.district.touched).toBe(true);
    expect(component.registerForm.controls.latitude.touched).toBe(true);
    expect(component.registerForm.controls.longitude.touched).toBe(true);
  });

  it('should show field error when server returns DEVICE_ALREADY_REGISTERED', () => {
    const error = new ApiError({
      status: 409,
      code: ApiErrorCode.DeviceAlreadyRegistered,
      message: 'Device serial is already registered',
      requestUrl: '/api/v1/admin/bins',
    });
    binsServiceSpy.registerBin.mockReturnValue(throwError(() => error));

    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: 'SN-DUPLICATE',
      district: 'Cairo',
      latitude: 30.0444,
      longitude: 31.2357,
      capacityThresholdKg: 100,
    });

    component.submitRegisterBin();

    expect(component.isSubmitting()).toBe(false);
    expect(component.serialServerError()).toContain('already registered');
    expect(component.registerForm.controls.deviceSerial.invalid).toBe(true);
  });

  it('should register bin, show toast, close drawer, and reload list on success', () => {
    component.openRegisterDrawer();
    component.registerForm.setValue({
      deviceSerial: 'SN-NEW-NODE',
      district: 'Alexandria',
      latitude: 31.2001,
      longitude: 29.9187,
      capacityThresholdKg: 150,
    });

    binsServiceSpy.getBins.mockClear();
    component.submitRegisterBin();

    expect(binsServiceSpy.registerBin).toHaveBeenCalledWith({
      deviceSerial: 'SN-NEW-NODE',
      district: 'Alexandria',
      latitude: 31.2001,
      longitude: 29.9187,
      capacityThresholdKg: 150,
    });

    expect(toastServiceSpy.success).toHaveBeenCalledWith('Smart bin registered successfully.');
    expect(component.isDrawerOpen()).toBe(false);
    expect(binsServiceSpy.getBins).toHaveBeenCalledTimes(1);
  });
});
