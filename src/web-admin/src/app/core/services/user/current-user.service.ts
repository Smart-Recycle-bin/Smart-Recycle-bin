import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  initials?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CurrentUserService {
  private readonly authService = inject(AuthService);
  private readonly manualOverride = signal<CurrentUser | null>(null);

  /**
   * Derived current user signal reflecting the authenticated session, with support for manual overrides.
   */
  readonly user = computed<CurrentUser>(() => {
    const override = this.manualOverride();
    if (override) {
      return override;
    }

    const session = this.authService.session();
    if (session?.user) {
      const name = session.user.displayName;
      const initials = name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return {
        id: session.user.userId,
        name: session.user.displayName,
        email: 'admin@ecobin.eg',
        role: session.user.role,
        initials,
      };
    }

    return {
      id: 'ADM-001',
      name: 'Laila Hamdy',
      email: 'admin@ecobin.eg',
      role: 'SYS_ADMIN',
      initials: 'LH',
    };
  });

  setUser(user: CurrentUser): void {
    this.manualOverride.set(user);
  }
}
