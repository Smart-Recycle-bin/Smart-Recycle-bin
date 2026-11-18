import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SurveyQa } from './survey-qa';
import { SurveyQaService } from '@services/survey/survey-qa.service';
import {
  MOCK_RECENT_SURVEYS,
  MOCK_SURVEY_QA_SUMMARY,
} from '@core/mock/data/survey/survey.mock';
import { SurveyOutcome } from '@models/survey/survey-outcome.enum';
import {
  formatSignedPp,
  getCategoryColor,
  getConfirmRateTrend,
  getRejectRateTrend,
} from './survey-qa.config';

describe('SurveyQa', () => {
  let component: SurveyQa;
  let fixture: ComponentFixture<SurveyQa>;
  let surveyQaServiceMock: {
    getQaSummary: ReturnType<typeof vi.fn>;
    getRecentSurveys: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    surveyQaServiceMock = {
      getQaSummary: vi.fn().mockReturnValue(of(structuredClone(MOCK_SURVEY_QA_SUMMARY))),
      getRecentSurveys: vi.fn().mockReturnValue(
        of({
          items: structuredClone(MOCK_RECENT_SURVEYS),
          page: 1,
          pageSize: 6,
          totalItems: 24,
          totalPages: 4,
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SurveyQa],
      providers: [
        {
          provide: SurveyQaService,
          useValue: surveyQaServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SurveyQa);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load survey QA data and recent surveys', () => {
    expect(component).toBeTruthy();
    expect(surveyQaServiceMock.getQaSummary).toHaveBeenCalledTimes(1);
    expect(surveyQaServiceMock.getRecentSurveys).toHaveBeenCalledTimes(1);
    // Verified: getQaSummary was called without query parameters per p11 fixed 14d
    expect(surveyQaServiceMock.getQaSummary).toHaveBeenCalledWith();
    expect(component.summary()).toEqual(MOCK_SURVEY_QA_SUMMARY);
    expect(component.pagedList.items().length).toBe(9);
    expect(component.isLoading()).toBe(false);
  });

  it('should render 4 KPI stats with correct values and trend flags', () => {
    const kpis = component.kpis();
    expect(kpis).not.toBeNull();
    expect(kpis?.totalSurveys).toBe(18402);
    expect(kpis?.confirmRate).toBe(92.6);
    expect(kpis?.rejectRate).toBe(7.4);
    expect(kpis?.flaggedToAiQueue).toBe(1362);

    // Confirm rate: +0.8 pp delta -> positive trend
    expect(component.confirmDeltaText()).toBe('+0.8 pp');
    expect(component.confirmTrend()).toBe('positive');

    // Reject rate: -0.8 pp delta -> falling reject rate is POSITIVE trend
    expect(component.rejectDeltaText()).toBe('-0.8 pp');
    expect(component.rejectTrend()).toBe('positive');

    const compiled = fixture.nativeElement as HTMLElement;
    const statsContainer = compiled.querySelector('[data-testid="survey-qa-stats"]');
    expect(statsContainer).toBeTruthy();
    const textContent = statsContainer?.textContent ?? '';
    expect(textContent).toContain('18,402');
    expect(textContent).toContain('92.6');
    expect(textContent).toContain('7.4');
    expect(textContent).toContain('1,362');
  });

  describe('Trend and delta helper functions', () => {
    it('should calculate reject rate trend correctly where falling is positive', () => {
      // Falling reject rate is positive
      expect(getRejectRateTrend(-0.8)).toBe('positive');
      expect(getRejectRateTrend(-2.5)).toBe('positive');
      // Rising reject rate is negative
      expect(getRejectRateTrend(0.8)).toBe('negative');
      expect(getRejectRateTrend(1.5)).toBe('negative');
      // Zero is neutral
      expect(getRejectRateTrend(0)).toBe('neutral');
    });

    it('should calculate confirm rate trend correctly where rising is positive', () => {
      expect(getConfirmRateTrend(0.8)).toBe('positive');
      expect(getConfirmRateTrend(-0.8)).toBe('negative');
      expect(getConfirmRateTrend(0)).toBe('neutral');
    });

    it('should format signed percentage points', () => {
      expect(formatSignedPp(0.8)).toBe('+0.8 pp');
      expect(formatSignedPp(-0.8)).toBe('-0.8 pp');
      expect(formatSignedPp(0)).toBe('0 pp');
    });

    it('should resolve category colors', () => {
      expect(getCategoryColor('Mixed packaging', 0)).toBe('var(--chart-5)');
      expect(getCategoryColor('Plastic (PET)', 1)).toBe('var(--chart-1)');
      expect(getCategoryColor('Unknown Material', 0)).toBe('var(--chart-1)');
    });
  });

  it('should supply correct data to the Confirm vs. Reject donut chart with center = reject rate', () => {
    const donutData = component.donutData();
    expect(donutData.length).toBe(2);
    expect(donutData[0].label).toBe('Confirmed');
    expect(donutData[0].value).toBe(17040);
    expect(donutData[1].label).toBe('Rejected');
    expect(donutData[1].value).toBe(1362);

    // Center value is reject rate (7.4%)
    expect(component.donutCenterValue()).toBe('7.4%');

    const compiled = fixture.nativeElement as HTMLElement;
    const donutCard = compiled.querySelector('[data-testid="donut-card"]');
    expect(donutCard).toBeTruthy();
    expect(donutCard?.textContent).toContain('Confirm vs. reject');
  });

  it('should supply correct data to the Rejection rate trend area chart', () => {
    const points = component.trendPoints();
    expect(points.length).toBe(13);
    expect(points[0].value).toBe(5.0);
    expect(points[12].value).toBe(7.4);

    const compiled = fixture.nativeElement as HTMLElement;
    const trendCard = compiled.querySelector('[data-testid="trend-card"]');
    expect(trendCard).toBeTruthy();
    expect(trendCard?.textContent).toContain('Rejection rate trend');
  });

  it('should supply top 6 bins and waste categories to bar lists', () => {
    const bins = component.highestRejectionBins();
    // Bins list should contain highest 6
    expect(bins.length).toBe(6);
    expect(bins[0].label).toBe('BIN-0084');
    expect(bins[0].value).toBe(14.2);
    expect(bins[0].formattedValue).toBe('14.2%');
    expect(bins[5].label).toBe('BIN-0018');
    expect(bins[5].value).toBe(7.7);

    const categories = component.rejectionByCategory();
    expect(categories.length).toBe(6);
    expect(categories[0].label).toBe('Mixed packaging');
    expect(categories[0].value).toBe(19.4);
    expect(categories[0].formattedValue).toBe('19.4%');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="bins-breakdown-card"]')).toBeTruthy();
    expect(compiled.querySelector('[data-testid="categories-breakdown-card"]')).toBeTruthy();
  });

  it('should configure recent surveys table with client pagination and badge mapping', () => {
    expect(component.pagedList.items().length).toBe(9);
    expect(component.columns.length).toBe(5);

    // Badge mapping check
    expect(component.getResultBadgeVariant(SurveyOutcome.Confirmed)).toBe('success');
    expect(component.getResultBadgeVariant(SurveyOutcome.Rejected)).toBe('danger');

    // Row id function check
    expect(component.getRowId(MOCK_RECENT_SURVEYS[0])).toBe('S-88213');

    const compiled = fixture.nativeElement as HTMLElement;
    const tableCard = compiled.querySelector('[data-testid="recent-surveys-card"]');
    expect(tableCard).toBeTruthy();
    // Verify first page renders rows
    expect(tableCard?.textContent).toContain('S-88213');
    expect(tableCard?.textContent).toContain('Omar Hassan');
    expect(tableCard?.textContent).toContain('3× PET bottle');
    expect(tableCard?.textContent).toContain('Rejected');
    expect(tableCard?.textContent).toContain('Confirmed');
  });

  it('handles race conditions: slow first request is cancelled by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    surveyQaServiceMock.getRecentSurveys.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    component.pagedList.setPage(2);
    component.pagedList.setPage(3);

    fastSubject.next({
      items: [{ ...MOCK_RECENT_SURVEYS[0], sessionId: 'S-FAST' }],
      page: 3,
      pageSize: 6,
      totalItems: 24,
      totalPages: 4,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].sessionId).toBe('S-FAST');

    slowSubject.next({
      items: [{ ...MOCK_RECENT_SURVEYS[0], sessionId: 'S-SLOW' }],
      page: 2,
      pageSize: 6,
      totalItems: 24,
      totalPages: 4,
    });
    slowSubject.complete();

    expect(component.pagedList.items()[0].sessionId).toBe('S-FAST');
  });

  it('handles server-side pagination and sorting', () => {
    surveyQaServiceMock.getRecentSurveys.mockClear();

    component.pagedList.setPage(2);
    expect(surveyQaServiceMock.getRecentSurveys).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 6 })
    );

    component.pagedList.setSort('points', 'desc');
    expect(surveyQaServiceMock.getRecentSurveys).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, sortBy: 'points', sortDir: 'desc' })
    );
  });

  it('should handle error state and allow retrying data load', () => {
    // Reset service to return error on retry
    surveyQaServiceMock.getQaSummary.mockReturnValue(throwError(() => new Error('Server timeout')));

    component.loadData();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-error-state')).toBeTruthy();

    // Now mock recovery on second retry
    surveyQaServiceMock.getQaSummary.mockReturnValue(of(structuredClone(MOCK_SURVEY_QA_SUMMARY)));

    component.loadData();
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.summary()).not.toBeNull();
    expect(compiled.querySelector('app-error-state')).toBeFalsy();
    expect(compiled.querySelector('[data-testid="survey-qa-stats"]')).toBeTruthy();
  });
});
