import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Leaderboards } from './leaderboards';
import { LeaderboardService } from '@services/gamification/leaderboard.service';
import {
  MOCK_LEADERBOARD_WEEKLY,
  MOCK_MILESTONE_BADGES,
} from '@core/mock/data/gamification/gamification.mock';
import { LeaderboardScope } from '@models/gamification/leaderboard-scope.enum';
import { getRankBadgeClass } from './leaderboards.config';

describe('Leaderboards', () => {
  let component: Leaderboards;
  let fixture: ComponentFixture<Leaderboards>;
  let leaderboardServiceMock: {
    getLeaderboard: ReturnType<typeof vi.fn>;
    getMilestoneBadges: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    leaderboardServiceMock = {
      getLeaderboard: vi.fn().mockReturnValue(
        of({
          items: structuredClone(MOCK_LEADERBOARD_WEEKLY),
          page: 1,
          pageSize: 10,
          totalItems: 25,
          totalPages: 3,
        })
      ),
      getMilestoneBadges: vi.fn().mockReturnValue(of(structuredClone(MOCK_MILESTONE_BADGES))),
    };

    await TestBed.configureTestingModule({
      imports: [Leaderboards],
      providers: [
        {
          provide: LeaderboardService,
          useValue: leaderboardServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Leaderboards);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load weekly leaderboard and milestone badges on mount', () => {
    expect(component).toBeTruthy();
    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ scope: LeaderboardScope.Weekly })
    );
    expect(leaderboardServiceMock.getMilestoneBadges).toHaveBeenCalledTimes(1);

    expect(component.activeScope()).toBe(LeaderboardScope.Weekly);
    expect(component.leaderboardRows().length).toBe(12);
    expect(component.milestoneBadges().length).toBe(5);
    expect(component.isLoadingLeaderboard()).toBe(false);
    expect(component.isLoadingBadges()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    // Header & Read-only badge
    expect(compiled.querySelector('[data-testid="read-only-badge"]')?.textContent?.trim()).toBe(
      'Read-only'
    );
    expect(compiled.querySelector('.leaderboard-column')).toBeTruthy();
    expect(compiled.querySelector('.badges-column')).toBeTruthy();
  });

  it('should trigger service with corresponding scope when scope tab changes', () => {
    // Switch to Monthly tab
    component.handleTabChange(LeaderboardScope.Monthly);
    expect(component.activeScope()).toBe(LeaderboardScope.Monthly);
    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: LeaderboardScope.Monthly, page: 1 })
    );

    // Switch to All-time tab
    component.handleTabChange(LeaderboardScope.AllTime);
    expect(component.activeScope()).toBe(LeaderboardScope.AllTime);
    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: LeaderboardScope.AllTime, page: 1 })
    );

    // Switch back to Weekly tab
    component.handleTabChange(LeaderboardScope.Weekly);
    expect(component.activeScope()).toBe(LeaderboardScope.Weekly);
    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: LeaderboardScope.Weekly, page: 1 })
    );
  });

  describe('Rank styling', () => {
    it('should assign gold, silver, bronze to ranks 1-3 and neutral to other ranks', () => {
      expect(getRankBadgeClass(1)).toBe('rank-gold');
      expect(getRankBadgeClass(2)).toBe('rank-silver');
      expect(getRankBadgeClass(3)).toBe('rank-bronze');
      expect(getRankBadgeClass(4)).toBe('rank-neutral');
      expect(getRankBadgeClass(5)).toBe('rank-neutral');
      expect(getRankBadgeClass(10)).toBe('rank-neutral');
    });

    it('should render rank circles with correct CSS classes in the DOM', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      const rank1 = compiled.querySelector('[data-testid="rank-1"]');
      expect(rank1).toBeTruthy();
      expect(rank1?.classList.contains('rank-gold')).toBe(true);

      const rank2 = compiled.querySelector('[data-testid="rank-2"]');
      expect(rank2).toBeTruthy();
      expect(rank2?.classList.contains('rank-silver')).toBe(true);

      const rank3 = compiled.querySelector('[data-testid="rank-3"]');
      expect(rank3).toBeTruthy();
      expect(rank3?.classList.contains('rank-bronze')).toBe(true);

      const rank4 = compiled.querySelector('[data-testid="rank-4"]');
      expect(rank4).toBeTruthy();
      expect(rank4?.classList.contains('rank-neutral')).toBe(true);
    });
  });

  it('should render table columns and paginate 12 rows with pageSize=10', () => {
    expect(component.leaderboardRows().length).toBe(12);

    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector('app-data-table');
    expect(table).toBeTruthy();

    // Verify first row contents
    const textContent = table?.textContent ?? '';
    expect(textContent).toContain('Nour El-Sayed');
    expect(textContent).toContain('U-10021');
    expect(textContent).toContain('738 pts');
    expect(textContent).toContain('19 kg');

    // Verify tenth row contents
    expect(textContent).toContain('Khaled Wahba');
    expect(textContent).toContain('U-10147');
  });

  it('should render all milestone badges in the right-side card', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badgesSection = compiled.querySelector('[data-testid="milestone-badges-list"]');
    expect(badgesSection).toBeTruthy();

    const textContent = badgesSection?.textContent ?? '';
    expect(textContent).toContain('Seedling');
    expect(textContent).toContain('11,840 earned');
    expect(textContent).toContain('Green Starter');
    expect(textContent).toContain('Eco Warrior');
    expect(textContent).toContain('Nile Guardian');
    expect(textContent).toContain('Planet Hero');
    expect(textContent).toContain('38 earned');
  });

  it('resets page to 1 when changing scope tabs', () => {
    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleTabChange(LeaderboardScope.Monthly);
    expect(component.pagedList.page()).toBe(1);
    expect(component.activeScope()).toBe(LeaderboardScope.Monthly);
  });

  it('handles race conditions: slow first request is cancelled by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    leaderboardServiceMock.getLeaderboard.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    component.pagedList.setPage(2);
    component.pagedList.setPage(3);

    fastSubject.next({
      items: [{ ...MOCK_LEADERBOARD_WEEKLY[0], userId: 'U-FAST' }],
      page: 3,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].userId).toBe('U-FAST');

    slowSubject.next({
      items: [{ ...MOCK_LEADERBOARD_WEEKLY[0], userId: 'U-SLOW' }],
      page: 2,
      pageSize: 10,
      totalItems: 25,
      totalPages: 3,
    });
    slowSubject.complete();

    expect(component.pagedList.items()[0].userId).toBe('U-FAST');
  });

  it('handles server-side pagination and sorting', () => {
    leaderboardServiceMock.getLeaderboard.mockClear();

    component.pagedList.setPage(2);
    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 })
    );

    component.pagedList.setSort('lifetimePoints', 'desc');
    expect(leaderboardServiceMock.getLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, sortBy: 'lifetimePoints', sortDir: 'desc' })
    );
  });

  describe('Independent error and retry states', () => {
    it('should show error in leaderboard section while badges remain rendered when leaderboard fails on initial load', () => {
      // Mock leaderboard error, badges remain successful
      leaderboardServiceMock.getLeaderboard.mockReturnValue(
        throwError(() => new Error('Failed to load leaderboard'))
      );

      const errorFixture = TestBed.createComponent(Leaderboards);
      const errorComp = errorFixture.componentInstance;
      errorFixture.detectChanges();

      expect(errorComp.leaderboardError()).toBeTruthy();
      expect(errorComp.badgesError()).toBeNull();

      const compiled = errorFixture.nativeElement as HTMLElement;
      const leaderboardSection = compiled.querySelector('[data-testid="leaderboard-section"]');
      const badgesSection = compiled.querySelector('[data-testid="badges-section"]');

      expect(leaderboardSection?.querySelector('app-error-state')).toBeTruthy();
      expect(badgesSection?.querySelector('app-error-state')).toBeFalsy();
      expect(badgesSection?.querySelector('[data-testid="milestone-badges-list"]')).toBeTruthy();

      // Retry leaderboard
      leaderboardServiceMock.getLeaderboard.mockReturnValue(
        of({
          items: structuredClone(MOCK_LEADERBOARD_WEEKLY),
          page: 1,
          pageSize: 10,
          totalItems: 25,
          totalPages: 3,
        })
      );
      errorComp.loadLeaderboard();
      errorFixture.detectChanges();

      expect(errorComp.leaderboardError()).toBeNull();
      expect(leaderboardSection?.querySelector('app-error-state')).toBeFalsy();
      expect(leaderboardSection?.querySelector('app-data-table')).toBeTruthy();
    });

    it('should show error in badges card while leaderboard remains rendered when badges fail', () => {
      // Mock badges error, leaderboard remains successful
      leaderboardServiceMock.getMilestoneBadges.mockReturnValue(
        throwError(() => new Error('Failed to load badges'))
      );

      component.loadBadges();
      fixture.detectChanges();

      expect(component.badgesError()).toBeTruthy();
      expect(component.leaderboardError()).toBeNull();

      const compiled = fixture.nativeElement as HTMLElement;
      const leaderboardSection = compiled.querySelector('[data-testid="leaderboard-section"]');
      const badgesSection = compiled.querySelector('[data-testid="badges-section"]');

      expect(badgesSection?.querySelector('app-error-state')).toBeTruthy();
      expect(leaderboardSection?.querySelector('app-error-state')).toBeFalsy();
      expect(leaderboardSection?.querySelector('app-data-table')).toBeTruthy();

      // Retry badges
      leaderboardServiceMock.getMilestoneBadges.mockReturnValue(
        of(structuredClone(MOCK_MILESTONE_BADGES))
      );
      component.loadBadges();
      fixture.detectChanges();

      expect(component.badgesError()).toBeNull();
      expect(badgesSection?.querySelector('app-error-state')).toBeFalsy();
      expect(badgesSection?.querySelector('[data-testid="milestone-badges-list"]')).toBeTruthy();
    });
  });
});
