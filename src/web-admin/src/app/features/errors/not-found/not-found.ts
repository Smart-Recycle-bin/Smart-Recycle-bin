import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { Icon } from '@shared/components/icon/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink, Icon],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);

  readonly isAuthenticated = computed<boolean>(() => this.authService.isAuthenticated());

  readonly primaryLink = computed<string>(() =>
    this.isAuthenticated() ? '/overview' : '/login'
  );

  readonly primaryActionLabel = computed<string>(() =>
    this.isAuthenticated() ? 'Back to Overview' : 'Go to sign in'
  );

  readonly canGoBack = computed<boolean>(() => {
    if (typeof window === 'undefined' || !window.history) {
      return false;
    }
    return window.history.length > 1;
  });

  readonly requestedPath = computed<string>(() => {
    const url = this.router.url || '';
    const pathname = url.split('?')[0].split('#')[0];
    if (!pathname || pathname === '/' || pathname === '') {
      return '';
    }
    return pathname;
  });

  goBack(): void {
    this.location.back();
  }
}
