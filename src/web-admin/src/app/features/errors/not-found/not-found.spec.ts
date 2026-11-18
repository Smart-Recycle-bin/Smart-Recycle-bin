import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFound } from './not-found';
import { AuthService } from '@core/services/auth/auth.service';

describe('NotFound', () => {
  let component: NotFound;
  let fixture: ComponentFixture<NotFound>;
  let router: Router;
  let locationBackSpy: ReturnType<typeof vi.fn>;
  let isAuthSignal = signal<boolean>(true);

  beforeEach(async () => {
    isAuthSignal = signal<boolean>(true);
    locationBackSpy = vi.fn();

    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: isAuthSignal,
          },
        },
        {
          provide: Location,
          useValue: {
            back: locationBackSpy,
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  function createComponent(url = '/unknown-path', historyLength = 2): void {
    Object.defineProperty(router, 'url', {
      value: url,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(window.history, 'length', {
      value: historyLength,
      writable: true,
      configurable: true,
    });

    fixture = TestBed.createComponent(NotFound);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders the eyebrow text containing "Page not found" and exactly one h1', () => {
    createComponent();

    const eyebrow = fixture.nativeElement.querySelector('.not-found-eyebrow');
    expect(eyebrow).toBeTruthy();
    expect(eyebrow.textContent).toContain('Page not found');

    const headings = fixture.nativeElement.querySelectorAll('h1');
    expect(headings.length).toBe(1);
    expect(headings[0].textContent).toContain('Oops! This page took a day off');
  });

  it('renders inline SVG with aria-hidden="true" and focusable="false"', () => {
    createComponent();

    const svg: SVGElement = fixture.nativeElement.querySelector('svg.not-found-illustration');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');

    // Contains the smiling bin character and numerals
    expect(fixture.nativeElement.querySelector('.bin-character')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.bin-smile')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.numeral-four').length).toBe(2);
  });

  it('points primary link to /overview with "Back to Overview" when authenticated', () => {
    isAuthSignal.set(true);
    createComponent();

    const primaryBtn: HTMLAnchorElement = fixture.nativeElement.querySelector('.not-found-btn-primary');
    expect(primaryBtn).toBeTruthy();
    expect(primaryBtn.textContent).toContain('Back to Overview');
    expect(component.primaryLink()).toBe('/overview');
    expect(primaryBtn.getAttribute('href')).toBe('/overview');
  });

  it('points primary link to /login with "Go to sign in" when unauthenticated', () => {
    isAuthSignal.set(false);
    createComponent();

    const primaryBtn: HTMLAnchorElement = fixture.nativeElement.querySelector('.not-found-btn-primary');
    expect(primaryBtn).toBeTruthy();
    expect(primaryBtn.textContent).toContain('Go to sign in');
    expect(component.primaryLink()).toBe('/login');
    expect(primaryBtn.getAttribute('href')).toBe('/login');
  });

  it('renders "Go back" button when history length > 1 and calls Location.back()', () => {
    createComponent('/some-page', 3);

    const backBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.not-found-btn-ghost');
    expect(backBtn).toBeTruthy();
    expect(backBtn.textContent).toContain('Go back');

    backBtn.click();
    expect(locationBackSpy).toHaveBeenCalledTimes(1);
  });

  it('hides "Go back" button when history length is 1 or less', () => {
    createComponent('/some-page', 1);

    const backBtn = fixture.nativeElement.querySelector('.not-found-btn-ghost');
    expect(backBtn).toBeNull();
  });

  it('shows pathname only in "You tried" line with query params and hash stripped', () => {
    createComponent('/admin/bins/missing?region=cairo&active=true#section-2');

    const triedEl = fixture.nativeElement.querySelector('.not-found-tried');
    expect(triedEl).toBeTruthy();
    expect(triedEl.textContent).toContain('You tried:');

    const pathCode = fixture.nativeElement.querySelector('.tried-path');
    expect(pathCode.textContent.trim()).toBe('/admin/bins/missing');
  });

  it('hides "You tried" line when pathname is empty or root "/"', () => {
    createComponent('/');

    const triedEl = fixture.nativeElement.querySelector('.not-found-tried');
    expect(triedEl).toBeNull();
  });

  it('renders malicious XSS URL safely as inert text without executing', () => {
    const xssPath = '/<script>alert("xss")</script><img src=x onerror=alert(1)>';
    createComponent(xssPath);

    const pathCode = fixture.nativeElement.querySelector('.tried-path');
    expect(pathCode).toBeTruthy();
    expect(pathCode.textContent).toContain('<script>alert("xss")</script>');
    // Ensure innerHTML is encoded, script element does not exist
    expect(pathCode.querySelector('script')).toBeNull();
    expect(pathCode.querySelector('img')).toBeNull();
  });
});
