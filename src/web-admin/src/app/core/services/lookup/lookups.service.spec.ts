import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientService } from '../api/api-client.service';
import { LookupsService } from './lookups.service';
import {
  AdminLookupItem,
  CollectorLookupItem,
  DistrictLookupItem,
} from '@models/lookup/lookup.model';

describe('LookupsService', () => {
  let service: LookupsService;
  let apiMock: {
    get: ReturnType<typeof vi.fn>;
  };

  const mockDistricts: DistrictLookupItem[] = [
    { name: 'Cairo', region: 'Greater Cairo' },
    { name: 'Giza', region: 'Greater Cairo' },
  ];

  const mockCollectors: CollectorLookupItem[] = [
    { collectorId: 'C-001', displayName: 'Mahmoud Fathy' },
    { collectorId: 'C-002', displayName: 'Hossam El-Din' },
  ];

  const mockAdmins: AdminLookupItem[] = [
    { adminId: 'ADM-001', displayName: 'Laila Hamdy' },
    { adminId: 'ADM-002', displayName: 'Amr Shawky' },
  ];

  beforeEach(() => {
    apiMock = {
      get: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        LookupsService,
        { provide: ApiClientService, useValue: apiMock },
      ],
    });

    service = TestBed.inject(LookupsService);
  });

  it('should fetch and cache districts with shareReplay(1)', () => {
    apiMock.get.mockReturnValue(of(mockDistricts));

    let res1: DistrictLookupItem[] = [];
    let res2: DistrictLookupItem[] = [];

    service.getDistricts().subscribe((d) => (res1 = d));
    service.getDistricts().subscribe((d) => (res2 = d));

    expect(apiMock.get).toHaveBeenCalledTimes(1);
    expect(apiMock.get).toHaveBeenCalledWith('/admin/lookups/districts');
    expect(res1).toEqual(mockDistricts);
    expect(res2).toEqual(mockDistricts);
  });

  it('should fetch and cache collectors with shareReplay(1) and invalidate on demand', () => {
    apiMock.get.mockReturnValue(of(mockCollectors));

    service.getCollectors().subscribe();
    service.getCollectors().subscribe();

    expect(apiMock.get).toHaveBeenCalledTimes(1);

    // Invalidate collectors
    service.invalidateCollectors();

    service.getCollectors().subscribe();
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });

  it('should fetch and cache admins with shareReplay(1) and invalidate on demand', () => {
    apiMock.get.mockReturnValue(of(mockAdmins));

    service.getAdmins().subscribe();
    service.getAdmins().subscribe();

    expect(apiMock.get).toHaveBeenCalledTimes(1);

    service.invalidate('admins');

    service.getAdmins().subscribe();
    expect(apiMock.get).toHaveBeenCalledTimes(2);
  });

  it('should invalidate all caches when invalidate() is called without argument', () => {
    apiMock.get.mockReturnValue(of([]));

    service.getDistricts().subscribe();
    service.getCollectors().subscribe();
    service.getAdmins().subscribe();

    expect(apiMock.get).toHaveBeenCalledTimes(3);

    service.invalidate();

    service.getDistricts().subscribe();
    service.getCollectors().subscribe();
    service.getAdmins().subscribe();

    expect(apiMock.get).toHaveBeenCalledTimes(6);
  });
});
