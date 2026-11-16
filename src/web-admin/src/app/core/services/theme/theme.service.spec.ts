import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let documentMock: Document;
  let mediaListeners: Array<(e: { matches: boolean }) => void> = [];
  let systemDark = false;

  beforeEach(() => {
    localStorage.clear();
    mediaListeners = [];
    systemDark = false;

    // Mock window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: systemDark,
      media: query,
      onchange: null,
      addListener: (fn: (e: { matches: boolean }) => void) => mediaListeners.push(fn),
      removeListener: (fn: (e: { matches: boolean }) => void) => {
        mediaListeners = mediaListeners.filter((l) => l !== fn);
      },
      addEventListener: (_type: string, fn: (e: { matches: boolean }) => void) => mediaListeners.push(fn),
      removeEventListener: (_type: string, fn: (e: { matches: boolean }) => void) => {
        mediaListeners = mediaListeners.filter((l) => l !== fn);
      },
      dispatchEvent: () => true,
    })) as unknown as typeof window.matchMedia;

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    service = TestBed.inject(ThemeService);
    documentMock = TestBed.inject(DOCUMENT);
    documentMock.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    documentMock.documentElement.classList.remove('dark');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with system default when no saved preference exists', () => {
    expect(service.hasSavedPreference()).toBe(false);
    expect(service.currentTheme()).toBe('light');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should initialize with dark system default when OS prefers dark and no preference is saved', () => {
    systemDark = true;
    const darkService = TestBed.runInInjectionContext(() => new ThemeService());
    expect(darkService.currentTheme()).toBe('dark');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should set theme to dark, persist to localStorage, and add dark class to document root', () => {
    service.setTheme('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(service.isLight()).toBe(false);
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('app-theme-preference')).toBe('dark');
    expect(service.hasSavedPreference()).toBe(true);
  });

  it('should set theme to light, persist to localStorage, and remove dark class from document root', () => {
    service.setTheme('dark');
    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(service.isLight()).toBe(true);
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('app-theme-preference')).toBe('light');
  });

  it('should toggle between light and dark and persist', () => {
    service.setTheme('light');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('app-theme-preference')).toBe('dark');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('app-theme-preference')).toBe('light');
  });

  it('should respect saved preference on startup over system preference', () => {
    systemDark = false;
    localStorage.setItem('app-theme-preference', 'dark');
    const customService = TestBed.runInInjectionContext(() => new ThemeService());
    expect(customService.currentTheme()).toBe('dark');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should react live to OS color scheme changes when no saved preference exists', () => {
    expect(service.hasSavedPreference()).toBe(false);
    expect(service.currentTheme()).toBe('light');

    // Simulate OS switching to dark
    for (const listener of mediaListeners) {
      listener({ matches: true });
    }

    expect(service.currentTheme()).toBe('dark');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);

    // Simulate OS switching back to light
    for (const listener of mediaListeners) {
      listener({ matches: false });
    }

    expect(service.currentTheme()).toBe('light');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should ignore live OS color scheme changes when explicit user preference is saved', () => {
    service.setTheme('light');
    expect(service.hasSavedPreference()).toBe(true);

    // Simulate OS switching to dark
    for (const listener of mediaListeners) {
      listener({ matches: true });
    }

    // Explicit choice wins: remains light
    expect(service.currentTheme()).toBe('light');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should update theme-color meta tag on theme change', () => {
    const meta = documentMock.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#009966');
    documentMock.head.appendChild(meta);

    service.setTheme('dark');
    expect(meta.getAttribute('content')).toBe('#0A101F');

    service.setTheme('light');
    expect(meta.getAttribute('content')).toBe('#009966');

    documentMock.head.removeChild(meta);
  });
});
