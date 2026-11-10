import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('App Routes', () => {
  let router: Router;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    }).compileComponents();

    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  it('should redirect empty path to /overview', async () => {
    await harness.navigateByUrl('/');
    expect(router.url).toBe('/overview');
    expect(harness.routeNativeElement?.textContent).toContain('Overview');
  });

  it('should render login placeholder inside AuthLayout', async () => {
    await harness.navigateByUrl('/login');
    expect(router.url).toBe('/login');
    expect(harness.routeNativeElement?.textContent).toContain('Sign in');
  });

  it('should render lazy dev components showcase', async () => {
    await harness.navigateByUrl('/dev/components');
    expect(router.url).toBe('/dev/components');
    expect(harness.routeNativeElement?.textContent).toContain('EcoBin UI Kit Showcase');
  });

  it('should render admin placeholder routes', async () => {
    const adminPaths: [string, string][] = [
      ['/bins', 'Bins List'],
      ['/bins/map', 'Live Bin Map'],
      ['/recyclers', 'Recyclers'],
      ['/collectors', 'Collectors'],
      ['/wallet', 'Wallet & Ledger'],
      ['/review-queue', 'AI Review Queue'],
      ['/survey-qa', 'Survey QA'],
      ['/rewards', 'Rewards Catalog'],
      ['/leaderboards', 'Leaderboards & Badges'],
      ['/audit-logs', 'Audit Logs'],
    ];

    for (const [url, expectedTitle] of adminPaths) {
      await harness.navigateByUrl(url);
      expect(router.url).toBe(url);
      expect(harness.routeNativeElement?.textContent).toContain(expectedTitle);
    }
  });

  it('should render NotFound on unknown routes', async () => {
    await harness.navigateByUrl('/non-existent-route');
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });
});
