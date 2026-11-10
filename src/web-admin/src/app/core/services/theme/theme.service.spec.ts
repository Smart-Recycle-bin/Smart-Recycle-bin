import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ThemeService, AppTheme } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let documentMock: Document;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [ThemeService],
    });

    service = TestBed.inject(ThemeService);
    documentMock = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set theme to dark and add dark class to document root', () => {
    service.setTheme('dark');
    expect(service.currentTheme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(service.isLight()).toBe(false);
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('app-theme-preference')).toBe('dark');
  });

  it('should set theme to light and remove dark class from document root', () => {
    service.setTheme('dark');
    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(service.isLight()).toBe(true);
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('app-theme-preference')).toBe('light');
  });

  it('should toggle between light and dark', () => {
    service.setTheme('light');
    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);

    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should respect saved preference on initializeTheme', () => {
    localStorage.setItem('app-theme-preference', 'dark');
    service.initializeTheme();
    expect(service.currentTheme()).toBe('dark');
    expect(documentMock.documentElement.classList.contains('dark')).toBe(true);
  });
});
