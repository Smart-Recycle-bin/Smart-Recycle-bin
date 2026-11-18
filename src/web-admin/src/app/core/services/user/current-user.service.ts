import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { initials } from '@shared/utils/format';

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
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
   * Derived current user signal reflecting the authenticated session, returning null when no session exists.
   */
  readonly user = computed<CurrentUser | null>(() => {
    const override = this.manualOverride();
    if (override) {
      return override;
    }

    const session = this.authService.session();
    if (session?.user) {
      const name = session.user.displayName;
      return {
        id: session.user.userId,
        name,
        role: session.user.role,
        initials: initials(name),
      };
    }

    return null;
  });

  setUser(user: CurrentUser | null): void {
    this.manualOverride.set(user);
  }
}
