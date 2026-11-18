import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LedgerService } from './ledger.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { LedgerEntryType } from '@models/wallet/ledger-entry-type.enum';

describe('LedgerService', () => {
  let service: LedgerService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LedgerService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LedgerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query ledger rows with filters', () => {
    service.getLedger({ type: LedgerEntryType.Credit }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/ledger?type=credit`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('should post manual points adjustment', () => {
    const payload = {
      userId: 'U-10063',
      amount: 420,
      type: LedgerEntryType.Debit,
      reasonCode: 'DUPLICATE_SESSION',
      reasonNote: 'Suspension clawback',
    };
    service.adjustPoints(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/ledger/adjustments`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { transactionId: 'tx_01', userId: 'U-10063', pointsDelta: -420, balanceAfter: 580 } });
  });
});
