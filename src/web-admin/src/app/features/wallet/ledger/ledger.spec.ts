import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Ledger } from './ledger';
import { LedgerService } from '@services/wallet/ledger.service';
import { RecyclersService } from '@services/user/recyclers.service';
import { ToastService } from '@services/toast/toast.service';
import { LedgerEntryType } from '@models/wallet/ledger-entry-type.enum';
import { LedgerSource } from '@models/wallet/ledger-source.enum';
import { ApiErrorCode } from '@models/common/api-error-code.enum';
import { ApiError } from '@core/errors/api-error';
import { MOCK_LEDGER_ROWS } from '@core/mock/data/wallet/wallet.mock';
import { MOCK_RECYCLERS } from '@core/mock/data/user/user.mock';
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
    vi.useFakeTimers();

    ledgerServiceSpy = {
      getLedger: vi.fn().mockReturnValue(
        of({
          items: MOCK_LEDGER_ROWS,
          page: 1,
          pageSize: 10,
          totalItems: MOCK_LEDGER_ROWS.length,
          totalPages: Math.ceil(MOCK_LEDGER_ROWS.length / 10),
        })
      ),
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
      getRecyclers: vi.fn().mockReturnValue(
        of({
          items: MOCK_RECYCLERS,
          page: 1,
          pageSize: 20,
          totalItems: MOCK_RECYCLERS.length,
          totalPages: Math.ceil(MOCK_RECYCLERS.length / 20),
        })
      ),
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
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and load ledger transactions on mount via pagedList sorted newest first', () => {
    expect(component).toBeTruthy();
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledTimes(1);
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 10,
        sortBy: 'timestamp',
        sortDir: 'desc',
      })
    );
    expect(component.pagedList.items().length).toBe(MOCK_LEDGER_ROWS.length);
    expect(component.pagedList.loading()).toBe(false);
  });

  it('debounces rapid search keystrokes: typing "omar" fires exactly 1 request', () => {
    ledgerServiceSpy.getLedger.mockClear();

    component.handleSearch('o');
    vi.advanceTimersByTime(50);
    component.handleSearch('om');
    vi.advanceTimersByTime(50);
    component.handleSearch('oma');
    vi.advanceTimersByTime(50);
    component.handleSearch('omar');

    expect(ledgerServiceSpy.getLedger).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledTimes(1);
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'omar',
        page: 1,
      })
    );
  });

  it('handles race conditions: slow first request is cancelled by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    ledgerServiceSpy.getLedger.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    component.pagedList.setPage(2);
    component.pagedList.setPage(3);

    fastSubject.next({
      items: [{ ...MOCK_LEDGER_ROWS[0], transactionId: 'tx-fast' }],
      page: 3,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].transactionId).toBe('tx-fast');

    slowSubject.next({
      items: [{ ...MOCK_LEDGER_ROWS[0], transactionId: 'tx-slow' }],
      page: 2,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    slowSubject.complete();

    expect(component.pagedList.items()[0].transactionId).toBe('tx-fast');
  });

  it('resets page to 1 on filter changes', () => {
    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleSourceChange(LedgerSource.ManualAdjustment);
    expect(component.pagedList.page()).toBe(1);

    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleDateRangeChange({ from: '2026-01-01', to: '2026-01-31' });
    expect(component.pagedList.page()).toBe(1);
  });

  it('fetches recyclers with pageSize 20 for typeahead in adjustment drawer', () => {
    let options: any[] = [];
    component.fetchRecyclers('Nour').subscribe((opts) => {
      options = opts;
    });

    expect(recyclersServiceSpy.getRecyclers).toHaveBeenCalledWith({
      search: 'Nour',
      pageSize: 20,
    });
    expect(options.length).toBe(MOCK_RECYCLERS.length);
    expect(options[0].value).toBe(MOCK_RECYCLERS[0].userId);
  });

  it('submits manual credit adjustment successfully and reloads pagedList', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.openAdjustmentDrawer();
    component.adjustmentType.set(LedgerEntryType.Credit);
    component.adjustmentForm.setValue({
      userId: 'U-10021',
      amount: 150,
      reasonCode: 'PROMOTION_BONUS',
      reasonNote: 'Community event bonus',
    });

    component.handleApplyClick();
    expect(component.isConfirmDialogOpen()).toBe(true);
    expect(ledgerServiceSpy.adjustPoints).not.toHaveBeenCalled();

    component.confirmAdjustment();

    expect(ledgerServiceSpy.adjustPoints).toHaveBeenCalledWith(
      {
        userId: 'U-10021',
        amount: 150,
        type: LedgerEntryType.Credit,
        reasonCode: 'PROMOTION_BONUS',
        reasonNote: 'Community event bonus',
      },
      { idempotencyKey: expect.any(String) }
    );
    expect(toastServiceSpy.success).toHaveBeenCalledWith(
      'Manual points adjustment recorded successfully'
    );
    expect(component.isAdjustmentDrawerOpen()).toBe(false);
    expect(component.isConfirmDialogOpen()).toBe(false);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('submits manual debit adjustment with negated delta via confirmation dialog', () => {
    const reloadSpy = vi.spyOn(component.pagedList, 'reload');

    component.openAdjustmentDrawer();
    component.handleAdjustmentTypeChange(LedgerEntryType.Debit);
    component.adjustmentForm.setValue({
      userId: 'U-10021',
      amount: 75,
      reasonCode: 'ADMIN_CORRECTION',
      reasonNote: 'Clawback due to disputed survey',
    });

    component.handleApplyClick();
    expect(component.isConfirmDialogOpen()).toBe(true);

    component.confirmAdjustment();

    expect(ledgerServiceSpy.adjustPoints).toHaveBeenCalledWith(
      {
        userId: 'U-10021',
        amount: -75,
        type: LedgerEntryType.Debit,
        reasonCode: 'ADMIN_CORRECTION',
        reasonNote: 'Clawback due to disputed survey',
      },
      { idempotencyKey: expect.any(String) }
    );
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('handles insufficient balance error on debit adjustment', () => {
    const insufficientBalanceError = new ApiError({
      status: 422,
      code: ApiErrorCode.InsufficientBalance,
      message: 'User has insufficient points for this deduction',
      requestUrl: '/api/v1/admin/wallet/adjust',
    });
    ledgerServiceSpy.adjustPoints.mockReturnValueOnce(
      throwError(() => insufficientBalanceError)
    );

    component.openAdjustmentDrawer();
    component.handleAdjustmentTypeChange(LedgerEntryType.Debit);
    component.adjustmentForm.setValue({
      userId: 'U-10021',
      amount: 5000,
      reasonCode: 'ADMIN_CORRECTION',
      reasonNote: 'Excessive debit',
    });

    component.handleApplyClick();
    component.confirmAdjustment();

    expect(component.isSubmitting()).toBe(false);
    expect(component.amountServerError()).toBe(
      'User has insufficient available points for this debit adjustment'
    );
    expect(component.adjustmentForm.controls.amount.errors).toEqual({
      insufficientBalance: true,
    });
  });

  it('validates amount limits (positive integer, max points limit) and trims reason note', () => {
    component.openAdjustmentDrawer();
    const amountCtrl = component.adjustmentForm.controls.amount;
    const noteCtrl = component.adjustmentForm.controls.reasonNote;

    amountCtrl.setValue(-50);
    expect(amountCtrl.invalid).toBe(true);
    expect(amountCtrl.errors).toHaveProperty('positiveInt');

    amountCtrl.setValue(1.5);
    expect(amountCtrl.invalid).toBe(true);
    expect(amountCtrl.errors).toHaveProperty('positiveInt');

    amountCtrl.setValue(10001);
    expect(amountCtrl.invalid).toBe(true);
    expect(amountCtrl.errors).toHaveProperty('max');

    amountCtrl.setValue(10000);
    expect(amountCtrl.valid).toBe(true);

    noteCtrl.setValue('   ');
    expect(noteCtrl.invalid).toBe(true);
    expect(noteCtrl.errors).toHaveProperty('trimmedRequired');

    noteCtrl.setValue('a'.repeat(501));
    expect(noteCtrl.invalid).toBe(true);
    expect(noteCtrl.errors).toHaveProperty('maxLen');
  });

  it('does not send API request when date range is inverted (from > to)', () => {
    component.handleDateRangeChange({ from: '2026-05-15', to: '2026-05-01' });
    // getLedger only called once during init
    expect(ledgerServiceSpy.getLedger).toHaveBeenCalledTimes(1);
  });

  it('formats points correctly with +/- signs and handles tones', () => {
    expect(formatSignedPoints(150)).toBe('+150');
    expect(formatSignedPoints(-50)).toBe('-50');
    expect(formatSignedPoints(0)).toBe('0');

    expect(getPointsTone(100)).toBe('positive');
    expect(getPointsTone(-100)).toBe('negative');
    expect(getPointsTone(0)).toBe('default');
  });

  it('maps ledger source types to expected badge variant and labels', () => {
    expect(getLedgerSourceBadgeVariant(LedgerSource.SessionConfirm)).toBe('success');
    expect(getLedgerSourceBadgeVariant(LedgerSource.ManualAdjustment)).toBe('warning');
    expect(getLedgerSourceBadgeVariant(LedgerSource.VoucherRedemption)).toBe('neutral');

    expect(getLedgerSourceLabel(LedgerSource.SessionConfirm)).toBe('Disposal credit');
    expect(getLedgerSourceLabel(LedgerSource.ManualAdjustment)).toBe('Manual adjustment');
    expect(getLedgerSourceLabel(LedgerSource.VoucherRedemption)).toBe('Redemption debit');
  });
});
