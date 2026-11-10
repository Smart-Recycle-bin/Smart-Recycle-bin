import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'overview',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout').then((m) => m.AuthLayout),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: {
          title: 'Sign in',
          description: 'Authentication page placeholder.',
        },
      },
    ],
  },
  {
    path: 'dev/components',
    loadComponent: () =>
      import('./features/dev/components-showcase/components-showcase').then(
        (m) => m.ComponentsShowcase
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Overview' },
      },
      {
        path: 'bins',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Bins List' },
      },
      {
        path: 'bins/map',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Live Bin Map' },
      },
      {
        path: 'recyclers',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Recyclers' },
      },
      {
        path: 'collectors',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Collectors' },
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Wallet & Ledger' },
      },
      {
        path: 'review-queue',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'AI Review Queue' },
      },
      {
        path: 'survey-qa',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Survey QA' },
      },
      {
        path: 'rewards',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Rewards Catalog' },
      },
      {
        path: 'leaderboards',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Leaderboards & Badges' },
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./features/placeholders/route-placeholder/route-placeholder').then(
            (m) => m.RoutePlaceholder
          ),
        data: { title: 'Audit Logs' },
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/placeholders/not-found/not-found').then((m) => m.NotFound),
  },
];
