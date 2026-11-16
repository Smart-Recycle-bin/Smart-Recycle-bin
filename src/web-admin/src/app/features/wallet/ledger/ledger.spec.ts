import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ledger } from './ledger';
import { LedgerService } from '../../../core/services/wallet/ledger.service';
import { RecyclersService } from '../../../core/services/user/recyclers.service';
import { ToastService } from '../../../core/services/toast/toast.service';
import { LedgerEntryType } from '../../../core/models/wallet/ledger-entry-type.enum';
import { LedgerSource } from '../../../core/models/wallet/ledger-source.enum';
import { ApiErrorCode } from '../../../core/models/common/api-error-code.enum';
import { ApiError } from '../../../core/errors/api-error';
import { MOCK_LEDGER_ROWS } from '../../../core/mock/data/wallet/wallet.mock';
import { MOCK_RECYCLERS } from '../../../core/mock/data/user/user.mock';
import {
  formatSignedPoints,
  getPointsTone,
  getLedgerSourceBadgeVariant,
  getLedgerSourceLabel,
} from './ledger.config';

describe('Ledger Component', () => {
  let component: Ledger;
  let fixture: ComponentFixture<Ledger>;
  let ledgerServiceSpy: {
    getLedger: ReturnType<typeof vi.fn>;
    adjustPoints: ReturnType<typeof vi.fn>;
  };
  let recyclersServiceSpy: {
    getRecyclers: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    ledgerServiceSpy = {
      getLedger: vi.fn().mockReturnValue(of({
        items: MOCK_LEDGER_ROWS,
        page: 1,
        pageSize: 10,
        totalItems: MOCK_LEDGER_ROWS.length,
        totalPages: Math.ceil(MOCK_LEDGER_ROWS.length / 10),
      })),
      adjustPoints: vi.fn().mockReturnValue(
        of({
          transactionId: 'tx_adj_001',
          userId: 'U-10021',
          pointsDelta: 150,
          balanceAfter: 4970,
        })
      ),
    };

    recyclersServiceSpy = {
      getRecyclers: vi.fn().mockReturnValue(of({
        items: MOCK_RECYCLERS,
        page: 1,
        pageSize: 10,
        totalItems: MOCK_RECYCLERS.length,
        totalPages: Math.ceil(MOCK_RECYCLERS.length / 10),
      })),
    };

    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Ledger],
      providers: [
        provideRouter([]),
        { provide: LedgerService, useValue: ledgerServiceSpy },
        { provide: RecyclersService, useValue: recyclersServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Ledger);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load ledger transactions on mount', () => {
    expect(component).toBeTruthy();
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledTimes(1);
    expect(component.ledgerRows().length).toBe(MOCK_LEDGER_ROWS.length);
    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should filter ledger by search query', () => {
    ledgerServiceSpy.getLedger.mockClear();

    component.handleSearch('Omar');
    expect(component.searchTerm()).toBe('Omar');
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledWith({
      search: 'Omar',
    });
  });

  it('should filter ledger by source type', () => {
    ledgerServiceSpy.getLedger.mockClear();

    component.handleTypeChange(LedgerSource.ManualAdjustment);
    expect(component.selectedSource()).toBe(LedgerSource.ManualAdjustment);
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledWith({
      source: LedgerSource.ManualAdjustment,
    });
  });

  it('should filter ledger by date range', () => {
    ledgerServiceSpy.getLedger.mockClear();

    component.handleDateRangeChange({
      from: '2025-06-01',
      to: '2025-06-15',
    });

    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledWith({
      from: '2025-06-01',
      to: '2025-06-15',
    });
  });

  it('should combine search, source, and date range in LedgerQuery', () => {
    ledgerServiceSpy.getLedger.mockClear();

    component.searchTerm.set('BIN-0001');
    component.selectedSource.set(LedgerSource.SessionConfirm);
    component.handleDateRangeChange({
      from: '2025-06-10',
      to: '2025-06-14',
    });

    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledWith({
      search: 'BIN-0001',
      source: LedgerSource.SessionConfirm,
      from: '2025-06-10',
      to: '2025-06-14',
    });
  });

  it('should open manual adjustment drawer and load recyclers', () => {
    component.openAdjustmentDrawer();

    expect(component.isAdjustmentDrawerOpen()).toBe(true);
    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledTimes(1);
    expect(component.userOptions().length).toBe(MOCK_RECYCLERS.length);
    expect(component.adjustmentType()).toBe(LedgerEntryType.Credit);
  });

  it('should validate adjustment form required fields and minimum amount', () => {
    component.openAdjustmentDrawer();

    component.adjustmentForm.controls.userId.setValue('');
    component.adjustmentForm.controls.amount.setValue(0);
    component.adjustmentForm.controls.reasonNote.setValue('');

    component.submitAdjustment();

    expect(ledgerServiceSpy.adjustPoints).not.toHaveBeenCalled();
    expect(component.userFieldError()).toBe('Target user is required');
    expect(component.amountFieldError()).toBe('Amount must be greater than zero');
  });

  it('should submit manual adjustment request with credit type, toast, close drawer, and reload', () => {
    ledgerServiceSpy.getLedger.mockClear();
    component.openAdjustmentDrawer();

    component.adjustmentForm.setValue({
      userId: 'U-10021',
      amount: 250,
      reasonCode: 'PROMOTION_BONUS',
      reasonNote: 'Special Earth Day community participation bonus',
    });

    component.submitAdjustment();

    expect(ledgerServiceSpy.adjustPoints).toHaveBeenCalledWith({
      userId: 'U-10021',
      amount: 250,
      type: LedgerEntryType.Credit,
      reasonCode: 'PROMOTION_BONUS',
      reasonNote: 'Special Earth Day community participation bonus',
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(component.isAdjustmentDrawerOpen()).toBe(false);
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledTimes(1);
  });

  it('should submit manual adjustment request with debit type', () => {
    component.openAdjustmentDrawer();
    component.handleAdjustmentTypeChange(LedgerEntryType.Debit);

    component.adjustmentForm.setValue({
      userId: 'U-10034',
      amount: 100,
      reasonCode: 'CORRECTION_CLAWBACK',
      reasonNote: 'Duplicate disposal credit adjustment clawback',
    });

    component.submitAdjustment();

    expect(ledgerServiceSpy.adjustPoints).toHaveBeenCalledWith({
      userId: 'U-10034',
      amount: 100,
      type: LedgerEntryType.Debit,
      reasonCode: 'CORRECTION_CLAWBACK',
      reasonNote: 'Duplicate disposal credit adjustment clawback',
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
  });

  it('should map INSUFFICIENT_BALANCE error to amount control', () => {
    const error400 = new ApiError({
      message: 'Insufficient balance',
      code: ApiErrorCode.InsufficientBalance,
      status: 400,
      requestUrl: '/api/v1/admin/ledger/adjustments',
    });
    ledgerServiceSpy.adjustPoints.mockReturnValue(throwError(() => error400));

    component.openAdjustmentDrawer();
    component.adjustmentForm.setValue({
      userId: 'U-10021',
      amount: 999999,
      reasonCode: 'DEBIT_TEST',
      reasonNote: 'Testing large debit',
    });

    component.submitAdjustment();

    expect(component.adjustmentForm.controls.amount.hasError('insufficientBalance')).toBe(true);
    expect(component.amountFieldError()).toBe(
      'User has insufficient available points for this debit adjustment'
    );
    expect(component.isAdjustmentDrawerOpen()).toBe(true);
  });

  it('should map NOT_FOUND error to user control', () => {
    const error404 = new ApiError({
      message: 'User not found',
      code: ApiErrorCode.NotFound,
      status: 404,
      requestUrl: '/api/v1/admin/ledger/adjustments',
    });
    ledgerServiceSpy.adjustPoints.mockReturnValue(throwError(() => error404));

    component.openAdjustmentDrawer();
    component.adjustmentForm.setValue({
      userId: 'U-INVALID-USER',
      amount: 50,
      reasonCode: 'TEST',
      reasonNote: 'Testing non-existent user',
    });

    component.submitAdjustment();

    expect(component.adjustmentForm.controls.userId.hasError('notFound')).toBe(true);
    expect(component.userFieldError()).toBe('Target recycler account was not found');
    expect(component.isAdjustmentDrawerOpen()).toBe(true);
  });

  it('should render error state on initial load failure and retry successfully', () => {
    ledgerServiceSpy.getLedger.mockReturnValueOnce(
      throwError(() => ({ message: 'Failed to fetch ledger' }))
    );

    component.loadLedger();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    ledgerServiceSpy.getLedger.mockReturnValueOnce(
      of({
        items: MOCK_LEDGER_ROWS,
        page: 1,
        pageSize: 10,
        totalItems: MOCK_LEDGER_ROWS.length,
        totalPages: 1,
      })
    );
    component.loadLedger();

    expect(component.error()).toBeNull();
    expect(component.ledgerRows().length).toBe(MOCK_LEDGER_ROWS.length);
  });

  it('should correctly format points, map tones, truncate IDs, and map source badges', () => {
    expect(formatSignedPoints(150)).toBe('+150');
    expect(formatSignedPoints(-420)).toBe('-420');
    expect(formatSignedPoints(0)).toBe('0');

    expect(getPointsTone(100)).toBe('positive');
    expect(getPointsTone(-50)).toBe('negative');
    expect(getPointsTone(0)).toBe('default');

    expect(component.truncateId('7f3a23a0-4c1e-4c12-92e1-000000000001')).toBe('7f3a23a0-4…');
    expect(component.truncateId('tx_short')).toBe('tx_short');

    expect(getLedgerSourceBadgeVariant(LedgerSource.SessionConfirm)).toBe('success');
    expect(getLedgerSourceBadgeVariant(LedgerSource.VoucherRedemption)).toBe('neutral');
    expect(getLedgerSourceBadgeVariant(LedgerSource.ManualAdjustment)).toBe('warning');

    expect(getLedgerSourceLabel(LedgerSource.SessionConfirm)).toBe('Disposal credit');
    expect(getLedgerSourceLabel(LedgerSource.VoucherRedemption)).toBe('Redemption debit');
    expect(getLedgerSourceLabel(LedgerSource.ManualAdjustment)).toBe('Manual adjustment');
  });
});
