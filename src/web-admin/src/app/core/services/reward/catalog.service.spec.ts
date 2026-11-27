import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { ApiClientService } from '../api/api-client.service';
import { resolveApiBaseUrl } from '@core/interceptors/shared/api-url';
import { RewardStatus } from '@models/reward/reward-status.enum';

const apiBaseUrl = resolveApiBaseUrl();

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

  it('should query paginated rewards with categoryId filter', () => {
    service.getRewards({ categoryId: 1, page: 2, pageSize: 10 }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.page).toBe(2);
      expect(page.totalItems).toBe(15);
      expect(page.totalPages).toBe(2);
    });

    const req = httpMock.expectOne(`${apiBaseUrl}/admin/catalog?categoryId=1&page=2&pageSize=10`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      data: [],
      meta: { page: 2, pageSize: 10, totalItems: 15, totalPages: 2 },
    });
  });

  it('should fetch active reward categories', () => {
    service.getCategories().subscribe((cats) => {
      expect(cats.length).toBe(1);
      expect(cats[0].categoryId).toBe(1);
      expect(cats[0].name).toBe('Groceries');
    });

    const req = httpMock.expectOne(`${apiBaseUrl}/admin/catalog/categories`);
    expect(req.request.method).toBe('GET');
    req.flush({
      success: true,
      data: [{ categoryId: 1, name: 'Groceries', status: 'active', logoUrl: null }],
    });
  });

  it('should create, update, and archive reward item', () => {
    const newReward = {
      title: 'Voucher',
      description: 'Grocery voucher',
      categoryId: 1,
      pointsCost: 500,
      stock: 50,
    };
    service.createReward(newReward).subscribe();
    const createReq = httpMock.expectOne(`${apiBaseUrl}/admin/catalog`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(newReward);
    createReq.flush({ success: true, data: { itemId: 9, categoryId: 1, categoryName: 'Groceries' } });

    service.updateReward(1, { pointsCost: 1600, categoryId: 2 }).subscribe();
    const updateReq = httpMock.expectOne(`${apiBaseUrl}/admin/catalog/1`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual({ pointsCost: 1600, categoryId: 2 });
    updateReq.flush({ success: true, data: { itemId: 1, categoryId: 2, categoryName: 'Food delivery' } });

    service.archiveReward(1).subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/admin/catalog/1/archive`)
      .flush({ success: true, data: { itemId: 1, status: RewardStatus.Archived } });
  });

  it('should upload image file', () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    service.uploadImage(file).subscribe();

    const req = httpMock.expectOne(`${apiBaseUrl}/admin/catalog/upload-image`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { imageUrl: 'https://example.com/test.png' } });
  });
});
