import { DOCUMENT, inject, Injectable, signal, computed, DestroyRef } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef, { optional: true });
  private readonly storageKey = 'app-theme-preference';

  /**
   * Reactive signal holding the currently active theme ('light' | 'dark').
   */
  readonly theme = signal<AppTheme>('light');

  /**
   * Readable reactive signals for derived states.
   */
  readonly currentTheme = computed<AppTheme>(() => this.theme());
  readonly isDark = computed<boolean>(() => this.theme() === 'dark');
  readonly isLight = computed<boolean>(() => this.theme() === 'light');

  private mediaQueryList: MediaQueryList | null = null;
  private mediaListener: ((e: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.initializeTheme();
    this.setupSystemMediaListener();
  }

  /**
   * Initializes the theme on application startup:
   * 1. Checks if a theme is saved in localStorage.
   * 2. If present, applies that theme (persisted).
   * 3. If absent, detects operating system preference.
   * 4. Applies the selected theme to the document root immediately.
   */
  initializeTheme(): void {
    const saved = this.getSavedTheme();
    if (saved) {
      this.applyTheme(saved, false);
      return;
    }

    const systemPrefersDark = this.detectSystemDarkMode();
    const initialTheme: AppTheme = systemPrefersDark ? 'dark' : 'light';
    this.applyTheme(initialTheme, false);
  }

  /**
   * Sets the theme explicitly ('light' | 'dark') and persists it.
   */
  setTheme(theme: AppTheme): void {
    this.applyTheme(theme, true);
  }

  /**
   * Toggles between 'light' and 'dark' and persists the preference.
   */
  toggleTheme(): void {
    const next: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  /**
   * Returns true if the user has an explicit theme preference saved in localStorage.
   */
  hasSavedPreference(): boolean {
    return this.getSavedTheme() !== null;
  }

  /**
   * Clears explicit user preference, reverting to system theme.
   */
  clearSavedPreference(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.storageKey);
      }
    } catch {
      // localStorage may be disabled
    }
    const systemPrefersDark = this.detectSystemDarkMode();
    this.applyTheme(systemPrefersDark ? 'dark' : 'light', false);
  }

  /**
   * Listens live to OS color scheme changes if no saved preference exists.
   */
  private setupSystemMediaListener(): void {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaListener = (e: MediaQueryListEvent) => {
          // If the user has explicitly chosen and saved a theme, the user's choice wins.
          if (this.hasSavedPreference()) {
            return;
          }
          const newTheme: AppTheme = e.matches ? 'dark' : 'light';
          this.applyTheme(newTheme, false);
        };

        if (this.mediaQueryList.addEventListener) {
          this.mediaQueryList.addEventListener('change', this.mediaListener);
        } else if ('addListener' in this.mediaQueryList) {
          (this.mediaQueryList as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(
            this.mediaListener
          );
        }

        this.destroyRef?.onDestroy(() => {
          if (this.mediaQueryList && this.mediaListener) {
            if (this.mediaQueryList.removeEventListener) {
              this.mediaQueryList.removeEventListener('change', this.mediaListener);
            } else if ('removeListener' in this.mediaQueryList) {
              (this.mediaQueryList as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(
                this.mediaListener
              );
            }
          }
        });
      }
    } catch {
      // matchMedia may be unavailable in certain environments
    }
  }

  /**
   * Applies the theme to the signal, the document root DOM element, meta tag, and optionally localStorage.
   */
  private applyTheme(theme: AppTheme, persist: boolean): void {
    this.theme.set(theme);

    if (persist) {
      this.saveTheme(theme);
    }

    const docEl = this.document?.documentElement;
    if (docEl) {
      if (theme === 'dark') {
        docEl.classList.add('dark');
        docEl.style.colorScheme = 'dark';
      } else {
        docEl.classList.remove('dark');
        docEl.style.colorScheme = 'light';
      }
    }

    try {
      const meta = this.document?.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', theme === 'dark' ? '#0A101F' : '#009966');
      }
    } catch {
      // DOM access might be constrained
    }
  }

  private getSavedTheme(): AppTheme | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(this.storageKey);
        if (val === 'dark' || val === 'light') {
          return val;
        }
      }
    } catch {
      // localStorage may be disabled or restricted in certain environments
    }
    return null;
  }

  private saveTheme(theme: AppTheme): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, theme);
      }
    } catch {
      // localStorage may be disabled or restricted in certain environments
    }
  }

  private detectSystemDarkMode(): boolean {
    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch {
      // matchMedia may be unavailable
    }
    return false;
  }
}
