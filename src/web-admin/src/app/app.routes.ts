import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { UserRole } from './core/models/user/user-role.enum';

declare const ngDevMode: boolean | undefined;

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'overview',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/auth/login/login').then((m) => m.Login),
        data: {
          title: 'Sign in',
          description: 'Sign in to the System Admin dashboard.',
        },
      },
    ],
  },
  ...((typeof ngDevMode === 'undefined' || ngDevMode)
    ? [
        {
          path: 'dev/components',
          loadComponent: () =>
            import('./features/dev/components-showcase/components-showcase').then(
              (m) => m.ComponentsShowcase
            ),
        },
      ]
    : []),
  {
    path: '',
    canActivate: [authGuard, roleGuard],
    data: { roles: [UserRole.Admin] },
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/analytics/overview/overview').then((m) => m.Overview),
        data: { title: 'Overview' },
      },
      {
        path: 'bins',
        loadComponent: () =>
          import('./features/bin/bins-list/bins-list').then((m) => m.BinsList),
        data: { title: 'Bins List' },
      },
      {
        path: 'bins/map',
        loadComponent: () =>
          import('./features/bin/live-bin-map/live-bin-map').then(
            (m) => m.LiveBinMap
          ),
        data: { title: 'Live Bin Map' },
      },
      {
        path: 'recyclers',
        loadComponent: () =>
          import('./features/user/recyclers/recyclers').then((m) => m.Recyclers),
        data: { title: 'Recyclers' },
      },
      {
        path: 'collectors',
        loadComponent: () =>
          import('./features/collector/collectors/collectors').then((m) => m.Collectors),
        data: { title: 'Collectors' },
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/wallet/ledger/ledger').then((m) => m.Ledger),
        data: { title: 'Wallet & Ledger' },
      },
      {
        path: 'review-queue',
        loadComponent: () =>
          import('./features/inspection/review-queue/review-queue').then((m) => m.ReviewQueue),
        data: { title: 'Reports' },
      },
      {
        path: 'review-queue/:reportId',
        loadComponent: () =>
          import('./features/inspection/report-detail/report-detail').then((m) => m.ReportDetail),
        data: { title: 'Reports' },
      },
      {
        path: 'survey-qa',
        loadComponent: () =>
          import('./features/survey/survey-qa/survey-qa').then((m) => m.SurveyQa),
        data: { title: 'Survey QA' },
      },
      {
        path: 'rewards',
        loadComponent: () =>
          import('./features/reward/catalog/catalog').then((m) => m.Catalog),
        data: { title: 'Rewards Catalog' },
      },
      {
        path: 'leaderboards',
        loadComponent: () =>
          import('./features/gamification/leaderboards/leaderboards').then(
            (m) => m.Leaderboards
          ),
        data: { title: 'Leaderboards & Badges' },
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./features/audit/audit-logs/audit-logs').then((m) => m.AuditLogs),
        data: { title: 'Audit Logs' },
      },
    ],
  },
  {
    path: '**',
    title: 'Page not found',
    loadComponent: () =>
      import('./features/errors/not-found/not-found').then((m) => m.NotFound),
  },
];
