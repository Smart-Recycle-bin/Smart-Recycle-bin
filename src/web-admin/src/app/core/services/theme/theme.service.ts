import { DOCUMENT, inject, Injectable, signal, computed } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);
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

  constructor() {
    this.initializeTheme();
  }

  /**
   * Initializes the theme on application startup:
   * 1. Checks if a theme is saved in localStorage.
   * 2. If present, applies that theme.
   * 3. If absent, detects operating system's color scheme preference.
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
   * Applies the theme to the signal, the document root DOM element, and optionally localStorage.
   */
  private applyTheme(theme: AppTheme, persist: boolean): void {
    this.theme.set(theme);

    if (persist) {
      this.saveTheme(theme);
    }

    const docEl = this.document.documentElement;
    if (theme === 'dark') {
      docEl.classList.add('dark');
    } else {
      docEl.classList.remove('dark');
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
