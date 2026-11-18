import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { RewardCategory } from '@models/reward/reward-category.enum';
import { RewardStatus } from '@models/reward/reward-status.enum';

describe('CatalogService', () => {
  let service: CatalogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query rewards with filters', () => {
    service.getRewards({ category: RewardCategory.Groceries }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/catalog?category=groceries`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('should create, update, and archive reward item', () => {
    const newReward = {
      title: 'Voucher',
      description: 'Grocery voucher',
      category: RewardCategory.Groceries,
      pointsCost: 500,
      stock: 50,
    };
    service.createReward(newReward).subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/catalog`)
      .flush({ success: true, data: { itemId: 'RWD-009' } });

    service.updateReward('RWD-001', { pointsCost: 1600 }).subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/catalog/RWD-001`)
      .flush({ success: true, data: { itemId: 'RWD-001' } });

    service.archiveReward('RWD-001').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/catalog/RWD-001/archive`)
      .flush({ success: true, data: { rewardId: 'RWD-001', status: RewardStatus.Archived } });
  });

  it('should upload image file', () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    service.uploadImage(file).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/catalog/upload-image`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { imageUrl: 'https://example.com/test.png' } });
  });
});
