import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeaderboardService } from './leaderboard.service';
import { ApiClientService } from '../api/api-client.service';
import { resolveApiBaseUrl } from '@core/interceptors/shared/api-url';
import { LeaderboardScope } from '@models/gamification/leaderboard-scope.enum';

const apiBaseUrl = resolveApiBaseUrl();

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LeaderboardService,
        ApiClientService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(LeaderboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch leaderboard by scope and milestone badges', () => {
    service.getLeaderboard({ scope: LeaderboardScope.Weekly }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });
    httpMock
      .expectOne(`${apiBaseUrl}/leaderboard?scope=weekly`)
      .flush({ success: true, data: [] });

    service.getMilestoneBadges().subscribe();
    httpMock
      .expectOne(`${apiBaseUrl}/admin/badges`)
      .flush({ success: true, data: [] });
  });
});
