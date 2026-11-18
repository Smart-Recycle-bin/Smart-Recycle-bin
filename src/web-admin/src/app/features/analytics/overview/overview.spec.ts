import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Overview } from './overview';
import { AnalyticsService } from '@services/analytics/analytics.service';
import { AnalyticsPeriod } from '@models/analytics/analytics-period.enum';
import { MOCK_OVERVIEW_7D } from '@core/mock/data/analytics/analytics.mock';

describe('Overview Component', () => {
  let component: Overview;
  let fixture: ComponentFixture<Overview>;
  let analyticsServiceSpy: {
    getOverview: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    analyticsServiceSpy = {
      getOverview: vi.fn().mockReturnValue(of(MOCK_OVERVIEW_7D)),
    };

    await TestBed.configureTestingModule({
      imports: [Overview],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Overview);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load overview data with default 7d period', () => {
    expect(component).toBeTruthy();
    expect(analyticsServiceSpy.getOverview).toHaveBeenCalledWith({
      period: AnalyticsPeriod.SevenDays,
    });
    expect(component.isLoading()).toBe(false);
    expect(component.overviewData()).toEqual(MOCK_OVERVIEW_7D);
  });

  it('should reload data when period changes via segmented control', () => {
    analyticsServiceSpy.getOverview.mockClear();

    component.handlePeriodChange(AnalyticsPeriod.ThirtyDays);
    expect(component.selectedPeriod()).toBe(AnalyticsPeriod.ThirtyDays);
    expect(analyticsServiceSpy.getOverview).toHaveBeenCalledWith({
      period: AnalyticsPeriod.ThirtyDays,
    });

    component.handlePeriodChange(AnalyticsPeriod.Today);
    expect(component.selectedPeriod()).toBe(AnalyticsPeriod.Today);
    expect(analyticsServiceSpy.getOverview).toHaveBeenCalledWith({
      period: AnalyticsPeriod.Today,
    });
  });

  it('should send from/to date range when period is custom', () => {
    analyticsServiceSpy.getOverview.mockClear();

    component.handlePeriodChange(AnalyticsPeriod.Custom);
    expect(analyticsServiceSpy.getOverview).toHaveBeenCalledWith({
      period: AnalyticsPeriod.Custom,
    });

    analyticsServiceSpy.getOverview.mockClear();
    component.handleCustomRangeChange({ from: '2025-06-01', to: '2025-06-15' });
    expect(analyticsServiceSpy.getOverview).toHaveBeenCalledWith({
      period: AnalyticsPeriod.Custom,
      from: '2025-06-01',
      to: '2025-06-15',
    });
  });

  it('should properly map stat cards deltas and trend directions', () => {
    const el = fixture.nativeElement as HTMLElement;
    const stats = el.querySelectorAll('app-stat');
    expect(stats.length).toBe(6);

    // Contamination rate trendPositive is false (rising contamination is bad/negative trend)
    expect(component.resolveTrend(MOCK_OVERVIEW_7D.contaminationRate.trendPositive)).toBe('negative');

    // Points issued trendPositive is true
    expect(component.resolveTrend(MOCK_OVERVIEW_7D.pointsIssued.trendPositive)).toBe('positive');
  });

  it('should compute and render points comparison series', () => {
    const series = component.pointsComparisonSeries();
    expect(series.length).toBe(2);
    expect(series[0].name).toBe('Issued');
    expect(series[1].name).toBe('Redeemed');
    expect(series[0].points.length).toBe(MOCK_OVERVIEW_7D.pointsComparisonSeries.length);
  });

  it('should compute fleet health percentages and material donut segments', () => {
    const fleet = component.fleetPercentages();
    // 14 / 23 = ~61%
    expect(fleet.availablePct).toBe(61);
    // 4 / 23 = ~17%
    expect(fleet.eightyPct).toBe(17);
    expect(fleet.needsServicingPct).toBe(17);
    // 1 / 23 = ~4%
    expect(fleet.offlinePct).toBe(4);

    const segments = component.materialDonutSegments();
    expect(segments.length).toBe(MOCK_OVERVIEW_7D.materialShares.length);
    expect(segments[0].label).toBe('Plastic');
    expect(segments[0].value).toBe(38);
  });

  it('should render urgent bins and urgent review items', () => {
    const el = fixture.nativeElement as HTMLElement;

    // Urgent bins list
    const urgentBinRows = el.querySelectorAll('.attention-subcol:first-child .attention-item-row');
    expect(urgentBinRows.length).toBe(MOCK_OVERVIEW_7D.urgentBins.length);
    expect(urgentBinRows[0].textContent).toContain('BIN-0007');
    expect(urgentBinRows[0].textContent).toContain('Tahrir Square North');

    // Urgent reviews list
    const urgentReviewRows = el.querySelectorAll('.attention-subcol:last-child .attention-item-row');
    expect(urgentReviewRows.length).toBe(MOCK_OVERVIEW_7D.urgentReviews.length);
    expect(urgentReviewRows[0].textContent).toContain('AIR-2048');
    expect(urgentReviewRows[0].textContent).toContain('Plastic (PET)');
  });

  it('should render top contamination hotspots bar list with thresholds', () => {
    const hotspots = component.hotspotItems();
    expect(hotspots.length).toBe(MOCK_OVERVIEW_7D.topContaminationHotspots.length);
    expect(hotspots[0].label).toBe('Other');
    expect(hotspots[0].value).toBe(23);
    expect(hotspots[0].formattedValue).toBe('23%');
    expect(component.hotspotThresholds).toEqual({ warning: 10, danger: 18 });
  });

  it('should render error state and reload when retry button is clicked', () => {
    analyticsServiceSpy.getOverview.mockReturnValue(throwError(() => new Error('Telemetry service offline')));

    component.loadOverview();
    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    const errorEl = el.querySelector('app-resource-state');
    expect(errorEl).toBeTruthy();

    // Now mock recovery and click retry
    analyticsServiceSpy.getOverview.mockReturnValue(of(MOCK_OVERVIEW_7D));
    component.loadOverview();
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.overviewData()).toEqual(MOCK_OVERVIEW_7D);
  });
});
