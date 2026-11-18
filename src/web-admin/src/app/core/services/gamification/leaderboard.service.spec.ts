import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeaderboardService } from './leaderboard.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { LeaderboardScope } from '@models/gamification/leaderboard-scope.enum';

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
      .expectOne(`${environment.apiBaseUrl}/leaderboard?scope=weekly`)
      .flush({ success: true, data: [] });

    service.getMilestoneBadges().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/badges`)
      .flush({ success: true, data: [] });
  });
});
