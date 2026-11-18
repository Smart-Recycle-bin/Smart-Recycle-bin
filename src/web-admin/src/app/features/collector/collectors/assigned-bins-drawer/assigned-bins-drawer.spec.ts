import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AssignedBinsDrawer } from './assigned-bins-drawer';
import { CollectorAssignedBin, CollectorListItem } from '@models/collector/collector.view-model';
import { BinStatus } from '@models/bin/bin-status.enum';
import { AccountStatus } from '@models/user/account-status.enum';

describe('AssignedBinsDrawer', () => {
  let component: AssignedBinsDrawer;
  let fixture: ComponentFixture<AssignedBinsDrawer>;

  const mockCollector: CollectorListItem = {
    collectorId: 'COL-001',
    name: 'Mahmoud Fathy',
    initials: 'MF',
    district: 'Nasr City',
    email: 'mahmoud@ecobin.eg',
    phone: '+20 100 123 4567',
    assignedBinsCount: 3,
    status: AccountStatus.Active,
    lastActiveAt: '2026-11-17T12:00:00Z',
  };

  const mockBins: CollectorAssignedBin[] = [
    {
      binId: 'BIN-101',
      name: 'Abbas El-Akkad Smart Bin',
      area: 'Abbas El-Akkad',
      district: 'Nasr City',
      fillLevel: 45,
      status: BinStatus.Available,
      lastServicedAt: new Date(Date.now() - 3600 * 1000).toISOString(), // 1h ago
    },
    {
      binId: 'BIN-102',
      name: 'Citystars Mall Bin',
      area: 'Makram Ebeid',
      district: 'Nasr City',
      fillLevel: 92,
      status: BinStatus.NeedsServicing,
      lastServicedAt: new Date(Date.now() - 86400 * 1000).toISOString(), // 1d ago (Yesterday)
    },
    {
      binId: 'BIN-103',
      name: 'Tayaran Square Bin',
      area: 'Tayaran',
      district: 'Nasr City',
      fillLevel: 80,
      status: BinStatus.EightyPercentFull,
      lastServicedAt: new Date(Date.now() - 120 * 1000).toISOString(), // 2m ago
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedBinsDrawer],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignedBinsDrawer);
    component = fixture.componentInstance;
  });

  it('should create the drawer component', () => {
    expect(component).toBeTruthy();
  });

  it('renders collector profile header correctly', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('collector', mockCollector);
    fixture.detectChanges();

    const headerEl = fixture.nativeElement.querySelector('.collector-profile-header');
    expect(headerEl).toBeTruthy();
    expect(headerEl.textContent).toContain('Mahmoud Fathy');
    expect(headerEl.textContent).toContain('COL-001');
    expect(headerEl.textContent).toContain('Nasr City');
    expect(headerEl.textContent).toContain('+20 100 123 4567');
  });

  it('computes statistical summary correctly (total, needAttention, offline, avgFill)', () => {
    fixture.componentRef.setInput('bins', mockBins);
    const summary = component.summary();

    expect(summary.total).toBe(3);
    // BIN-102 (92% / NeedsServicing) + BIN-103 (80% / EightyPercentFull) = 2 need attention
    expect(summary.needAttention).toBe(2);
    expect(summary.offline).toBe(0);
    // (45 + 92 + 80) / 3 = 217 / 3 = 72.33 -> 72%
    expect(summary.avgFill).toBe(72);
  });

  it('sorts bins worst-first by fillLevel desc then name', () => {
    fixture.componentRef.setInput('bins', mockBins);
    const sorted = component.sortedBins();

    expect(sorted[0].binId).toBe('BIN-102'); // 92%
    expect(sorted[1].binId).toBe('BIN-103'); // 80%
    expect(sorted[2].binId).toBe('BIN-101'); // 45%
  });

  it('renders bin cards with status accent edges and last serviced relative time', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('collector', mockCollector);
    fixture.componentRef.setInput('bins', mockBins);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.assigned-bin-card');
    expect(cards.length).toBe(3);

    // Worst bin (BIN-102, 92%, NeedsServicing) should be first and have edge-danger
    expect(cards[0].classList.contains('edge-danger')).toBe(true);
    expect(cards[0].textContent).toContain('Citystars Mall Bin');
    expect(cards[0].textContent).toContain('BIN-102');
    expect(cards[0].textContent).toContain('Makram Ebeid · Nasr City');
    expect(cards[0].textContent).toContain('Yesterday');

    // Second bin (BIN-103, 80%, EightyPercentFull) should have edge-warning
    expect(cards[1].classList.contains('edge-warning')).toBe(true);
    expect(cards[1].textContent).toContain('2m ago');

    // Third bin (BIN-101, 45%, Available) should have edge-success
    expect(cards[2].classList.contains('edge-success')).toBe(true);
    expect(cards[2].textContent).toContain('1h ago');
  });

  it('shows loading skeletons when loading is true', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const skeletonEl = fixture.nativeElement.querySelector('.drawer-loading-skeleton');
    expect(skeletonEl).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.summary-strip')).toBeNull();
  });

  it('shows error state and emits retry output on action click', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('error', 'Network timeout while fetching bins');
    fixture.detectChanges();

    let retryEmitted = false;
    component.retry.subscribe(() => {
      retryEmitted = true;
    });

    const errorEl = fixture.nativeElement.querySelector('.drawer-error-state');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Network timeout while fetching bins');

    const retryBtn = errorEl.querySelector('button');
    expect(retryBtn).toBeTruthy();
    retryBtn.click();
    expect(retryEmitted).toBe(true);
  });

  it('shows empty state when bins array is empty and emits assignBin output', () => {
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('bins', []);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', null);
    fixture.detectChanges();

    let assignEmitted = false;
    component.assignBin.subscribe(() => {
      assignEmitted = true;
    });

    const emptyEl = fixture.nativeElement.querySelector('.drawer-empty-state');
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.textContent).toContain('No smart bins assigned');

    const assignBtn = emptyEl.querySelector('button');
    expect(assignBtn).toBeTruthy();
    assignBtn.click();
    expect(assignEmitted).toBe(true);
  });

  it('emits closed output when close button is clicked', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    let closedEmitted = false;
    component.closed.subscribe(() => {
      closedEmitted = true;
    });

    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.drawer-footer-actions button');
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(closedEmitted).toBe(true);
  });
});
