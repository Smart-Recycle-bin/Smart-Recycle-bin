import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Catalog } from './catalog';
import { CatalogService } from '@services/reward/catalog.service';
import { ToastService } from '@services/toast/toast.service';
import { MOCK_REWARDS } from '@core/mock/data/reward/reward.mock';
import { formatDate } from '@shared/utils/datetime';
import { RewardStatus } from '@models/reward/reward-status.enum';
import { RewardCategory } from '@models/reward/reward-category.enum';
import { VoucherCodeType } from '@models/reward/voucher-code-type.enum';

describe('Catalog', () => {
  let component: Catalog;
  let fixture: ComponentFixture<Catalog>;
  let catalogServiceMock: {
    getRewards: ReturnType<typeof vi.fn>;
    createReward: ReturnType<typeof vi.fn>;
    updateReward: ReturnType<typeof vi.fn>;
    archiveReward: ReturnType<typeof vi.fn>;
    uploadImage: ReturnType<typeof vi.fn>;
  };
  let toastServiceMock: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
      width: 800,
      height: 600,
      close: vi.fn(),
    });

    catalogServiceMock = {
      getRewards: vi.fn().mockReturnValue(of(structuredClone(MOCK_REWARDS))),
      createReward: vi.fn().mockImplementation((req) =>
        of({
          ...req,
          itemId: 'rwd_new_123',
          code: 'RWD-999',
          redemptionsCount: 0,
          status: req.stock > 0 ? RewardStatus.InStock : RewardStatus.OutOfStock,
        })
      ),
      updateReward: vi.fn().mockImplementation((id, req) =>
        of({
          ...MOCK_REWARDS[0],
          ...req,
          itemId: id,
        })
      ),
      archiveReward: vi.fn().mockReturnValue(
        of({
          itemId: 'RWD-001',
          status: RewardStatus.Archived,
          message: 'Reward item archived successfully',
        })
      ),
      uploadImage: vi.fn().mockReturnValue(
        of({ imageUrl: 'https://storage.ecobin.com/rewards/uploaded_test.png' })
      ),
    };

    toastServiceMock = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Catalog],
      providers: [
        {
          provide: CatalogService,
          useValue: catalogServiceMock,
        },
        {
          provide: ToastService,
          useValue: toastServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Catalog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should compute default dates and empty price/stock at drawer open time with fake timers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));

    component.openNewItemDrawer();

    const formVal = component.rewardForm.value;
    expect(formVal.validFrom).toBe('2026-03-15');
    expect(formVal.validUntil).toBe('2027-03-15');
    expect(formVal.pointsCost).toBeNull();
    expect(formVal.stock).toBeNull();
  });

  it('should create and load catalog items with dynamic subtitle', () => {
    expect(component).toBeTruthy();
    expect(catalogServiceMock.getRewards).toHaveBeenCalledTimes(1);
    expect(component.rewards().length).toBe(8);
    expect(component.subtitle()).toBe('8 items · stock reaching zero is flagged automatically');
    expect(component.isLoading()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="rewards-grid"]')).toBeTruthy();
  });

  it('renders curated gradients and centered gift icons on reward cards in grid view', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.reward-card');
    expect(cards.length).toBe(8);

    const firstBanner = cards[0].querySelector('.card-banner') as HTMLElement;
    expect(firstBanner).toBeTruthy();
    expect(firstBanner.style.background).toContain('linear-gradient');
    expect(firstBanner.querySelector('.banner-gift-icon')).toBeTruthy();
  });

  it('should toggle between grid and table view while preserving loaded data', () => {
    expect(component.viewMode()).toBe('grid');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="rewards-grid"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="rewards-table"]')).toBeFalsy();

    // Toggle to Table view
    component.handleViewModeChange('table');
    fixture.detectChanges();

    expect(component.viewMode()).toBe('table');
    expect(component.rewards().length).toBe(8);
    expect(compiled.querySelector('[data-testid="rewards-table"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="rewards-grid"]')).toBeFalsy();

    // Toggle back to Grid view
    component.handleViewModeChange('grid');
    fixture.detectChanges();

    expect(component.viewMode()).toBe('grid');
    expect(compiled.querySelector('[data-testid="rewards-grid"]')).toBeTruthy();
  });

  it('should reload rewards when status filter changes', () => {
    component.handleStatusChange(RewardStatus.InStock);
    expect(component.selectedStatus()).toBe(RewardStatus.InStock);
    expect(catalogServiceMock.getRewards).toHaveBeenLastCalledWith({
      status: RewardStatus.InStock,
    });

    component.handleStatusChange(RewardStatus.OutOfStock);
    expect(component.selectedStatus()).toBe(RewardStatus.OutOfStock);
    expect(catalogServiceMock.getRewards).toHaveBeenLastCalledWith({
      status: RewardStatus.OutOfStock,
    });

    component.handleStatusChange('');
    expect(component.selectedStatus()).toBe('');
    expect(catalogServiceMock.getRewards).toHaveBeenLastCalledWith({});
  });

  describe('Create and Edit Validation', () => {
    it('should validate title as required and reject negative price and negative stock', () => {
      component.openNewItemDrawer();
      expect(component.isDrawerOpen()).toBe(true);
      expect(component.editingReward()).toBeNull();

      const form = component.rewardForm;

      // Negative pointsCost should be invalid
      form.patchValue({
        title: 'Discount Coupon',
        pointsCost: -50,
        stock: 10,
      });
      expect(form.get('pointsCost')?.valid).toBe(false);
      expect(form.get('pointsCost')?.hasError('positiveInt')).toBe(true);

      // Zero pointsCost should also be invalid (must be positive)
      form.patchValue({ pointsCost: 0 });
      expect(form.get('pointsCost')?.hasError('positiveInt')).toBe(true);

      // Negative stock should be invalid
      form.patchValue({
        pointsCost: 500,
        stock: -1,
      });
      expect(form.get('stock')?.valid).toBe(false);
      expect(form.get('stock')?.hasError('nonNegativeInt')).toBe(true);

      // Stock of 0 is valid (automatically marks item Out of Stock)
      form.patchValue({ stock: 0 });
      expect(form.get('stock')?.valid).toBe(true);

      // Attempting to submit invalid form should not call service
      form.patchValue({ title: '' }); // empty title
      component.submitDrawerForm();
      expect(catalogServiceMock.createReward).not.toHaveBeenCalled();
    });

    it('should prefill form when editing an existing reward', () => {
      const itemToEdit = MOCK_REWARDS[0]; // Carrefour Voucher EGP 50
      component.openEditDrawer(itemToEdit);

      expect(component.isDrawerOpen()).toBe(true);
      expect(component.editingReward()).toBe(itemToEdit);
      expect(component.uploadedImageUrl()).toBe(itemToEdit.imageUrl ?? null);

      const formVal = component.rewardForm.value;
      expect(formVal.title).toBe(itemToEdit.title);
      expect(formVal.category).toBe(itemToEdit.category);
      expect(formVal.voucherCodeType).toBe(itemToEdit.voucherCodeType);
      expect(formVal.pointsCost).toBe(itemToEdit.pointsCost);
      expect(formVal.stock).toBe(itemToEdit.stock);
      expect(formVal.validFrom).toBe(formatDate(itemToEdit.validFrom));
      expect(formVal.validUntil).toBe(formatDate(itemToEdit.validUntil));
    });
  });

  describe('Image upload and submission with imageUrl', () => {
    it('should upload image asset and include imageUrl in create payload', async () => {
      component.openNewItemDrawer();
      const mockFile = new File(['content'], 'voucher.png', { type: 'image/png' });

      // Trigger image selection
      await component.onFileSelected(mockFile);
      expect(catalogServiceMock.uploadImage).toHaveBeenCalledWith(mockFile);
      expect(component.uploadedImageUrl()).toBe(
        'https://storage.ecobin.com/rewards/uploaded_test.png'
      );
      expect(toastServiceMock.success).toHaveBeenCalledWith('Reward image uploaded');

      // Fill in valid form
      component.rewardForm.patchValue({
        title: '   Metro Market EGP 100   ',
        description: '   Groceries credit voucher   ',
        category: RewardCategory.Groceries,
        voucherCodeType: VoucherCodeType.Qr,
        pointsCost: 1800,
        stock: 30,
        validFrom: '2025-07-01',
        validUntil: '2025-12-31',
      });

      component.submitDrawerForm();

      expect(catalogServiceMock.createReward).toHaveBeenCalledWith({
        title: 'Metro Market EGP 100',
        description: 'Groceries credit voucher',
        category: RewardCategory.Groceries,
        voucherCodeType: VoucherCodeType.Qr,
        pointsCost: 1800,
        stock: 30,
        validFrom: '2025-07-01',
        validUntil: '2025-12-31',
        imageUrl: 'https://storage.ecobin.com/rewards/uploaded_test.png',
      });

      expect(toastServiceMock.success).toHaveBeenCalledWith('Reward item created successfully');
      expect(component.isDrawerOpen()).toBe(false);
    });

    it('should include updated imageUrl in update payload when editing', async () => {
      const itemToEdit = MOCK_REWARDS[1];
      component.openEditDrawer(itemToEdit);

      const mockFile = new File(['new-img'], 'talabat_updated.png', { type: 'image/png' });
      await component.onFileSelected(mockFile);

      component.rewardForm.patchValue({
        title: 'Talabat Credit EGP 150',
        pointsCost: 2500,
      });

      component.submitDrawerForm();

      expect(catalogServiceMock.updateReward).toHaveBeenCalledWith(
        itemToEdit.itemId,
        expect.objectContaining({
          title: 'Talabat Credit EGP 150',
          pointsCost: 2500,
          imageUrl: 'https://storage.ecobin.com/rewards/uploaded_test.png',
        })
      );
      expect(toastServiceMock.success).toHaveBeenCalledWith('Reward item updated successfully');
      expect(component.isDrawerOpen()).toBe(false);
    });

    it('rejects image files with invalid mime types', async () => {
      component.openNewItemDrawer();
      const textFile = new File(['hello'], 'document.txt', { type: 'text/plain' });
      await component.onFileSelected(textFile);

      expect(catalogServiceMock.uploadImage).not.toHaveBeenCalled();
      expect(component.uploadedImageUrl()).toBeNull();
      expect(component.imageError()).toContain('Image must be a PNG or JPG file');
    });

    it('rejects image files exceeding 5 MB', async () => {
      component.openNewItemDrawer();
      // create a mock file with size > 5 MB
      const bigFile = new File([''], 'big.png', { type: 'image/png' });
      Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

      await component.onFileSelected(bigFile);

      expect(catalogServiceMock.uploadImage).not.toHaveBeenCalled();
      expect(component.uploadedImageUrl()).toBeNull();
      expect(component.imageError()).toContain('5 MB or less');
    });

    it('rejects image files with dimensions smaller than 800x600', async () => {
      component.openNewItemDrawer();
      (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue({
        width: 400,
        height: 300,
        close: vi.fn(),
      });

      const smallImg = new File(['content'], 'small.png', { type: 'image/png' });
      await component.onFileSelected(smallImg);

      expect(catalogServiceMock.uploadImage).not.toHaveBeenCalled();
      expect(component.uploadedImageUrl()).toBeNull();
      expect(component.imageError()).toContain('at least 800×600');
    });
  });

  describe('Form Validation & Server Field Error Handling', () => {
    it('validates dateOrder when validUntil is earlier than validFrom', () => {
      component.openNewItemDrawer();
      component.rewardForm.patchValue({
        validFrom: '2026-10-15',
        validUntil: '2026-05-10',
      });

      expect(component.rewardForm.invalid).toBe(true);
      expect(component.rewardForm.errors).toHaveProperty('dateOrder');
    });

    it('validates positiveInt for points price and nonNegativeInt for stock', () => {
      component.openNewItemDrawer();
      const pointsCost = component.rewardForm.controls['pointsCost'];
      const stock = component.rewardForm.controls['stock'];

      pointsCost.setValue(-10);
      expect(pointsCost.invalid).toBe(true);
      expect(pointsCost.errors).toHaveProperty('positiveInt');

      pointsCost.setValue(0);
      expect(pointsCost.invalid).toBe(true);
      expect(pointsCost.errors).toHaveProperty('positiveInt');

      pointsCost.setValue(1.5);
      expect(pointsCost.invalid).toBe(true);
      expect(pointsCost.errors).toHaveProperty('positiveInt');

      pointsCost.setValue(100);
      expect(pointsCost.valid).toBe(true);

      stock.setValue(-5);
      expect(stock.invalid).toBe(true);
      expect(stock.errors).toHaveProperty('nonNegativeInt');

      stock.setValue(0);
      expect(stock.valid).toBe(true);
    });

    it('maps server field errors onto form controls upon creation failure', () => {
      catalogServiceMock.createReward.mockReturnValueOnce(
        throwError(() => ({
          status: 400,
          error: {
            success: false,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ field: 'title', message: 'Reward title already exists' }],
          },
        }))
      );

      component.openNewItemDrawer();
      component.rewardForm.patchValue({
        title: 'Duplicate Title',
        category: RewardCategory.Groceries,
        voucherCodeType: VoucherCodeType.Code,
        pointsCost: 500,
        stock: 10,
        validFrom: '2026-01-01',
        validUntil: '2026-12-31',
      });

      component.submitDrawerForm();

      expect(component.isSubmitting()).toBe(false);
      expect(component.rewardForm.controls['title'].errors).toEqual({
        serverError: 'Reward title already exists',
      });
    });
  });

  describe('Archive confirm dialog', () => {
    it('should open confirm dialog for active item and archive on confirm', () => {
      const itemToArchive = MOCK_REWARDS[0]; // InStock
      component.openArchiveDialog(itemToArchive);

      expect(component.isConfirmArchiveOpen()).toBe(true);
      expect(component.rewardToArchive()).toBe(itemToArchive);

      component.confirmArchive();

      expect(catalogServiceMock.archiveReward).toHaveBeenCalledWith(itemToArchive.itemId);
      expect(toastServiceMock.success).toHaveBeenCalledWith(`"${itemToArchive.title}" archived`);
      expect(component.isConfirmArchiveOpen()).toBe(false);
      expect(component.rewardToArchive()).toBeNull();
    });

    it('should not allow opening archive dialog for already archived item', () => {
      const archivedItem = MOCK_REWARDS.find((r) => r.status === RewardStatus.Archived);
      expect(archivedItem).toBeDefined();

      component.openArchiveDialog(archivedItem!);
      expect(component.isConfirmArchiveOpen()).toBe(false);
      expect(component.rewardToArchive()).toBeNull();
    });
  });

  describe('Out of Stock Presentation', () => {
    it('should display red "No stock" label when stock is 0 in grid view', () => {
      component.viewMode.set('grid');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      // Vodafone 1GB item has stock 0
      const outOfStockCard = compiled.querySelector('[data-testid="reward-card-RWD-003"]');
      expect(outOfStockCard).toBeTruthy();

      const outOfStockLabel = outOfStockCard?.querySelector('[data-testid="out-of-stock-label"]');
      expect(outOfStockLabel).toBeTruthy();
      expect(outOfStockLabel?.textContent?.trim()).toBe('No stock');
    });

    it('should display red "No stock" label when stock is 0 in table view', () => {
      component.viewMode.set('table');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const outOfStockCells = compiled.querySelectorAll('[data-testid="table-out-of-stock"]');
      expect(outOfStockCells.length).toBeGreaterThan(0);
      expect(outOfStockCells[0].textContent?.trim()).toBe('No stock');
    });
  });

  it('should render error state and allow retrying data load', () => {
    catalogServiceMock.getRewards.mockReturnValue(throwError(() => new Error('Network error')));
    component.loadRewards();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-error-state')).toBeTruthy();

    // Successful retry
    catalogServiceMock.getRewards.mockReturnValue(of(structuredClone(MOCK_REWARDS)));
    component.loadRewards();
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.rewards().length).toBe(8);
    expect(compiled.querySelector('app-error-state')).toBeFalsy();
    expect(compiled.querySelector('[data-testid="rewards-grid"]')).toBeTruthy();
  });
});
