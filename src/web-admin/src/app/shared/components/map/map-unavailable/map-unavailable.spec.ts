import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapUnavailable } from './map-unavailable';

describe('MapUnavailable Component', () => {
  let fixture: ComponentFixture<MapUnavailable>;
  let component: MapUnavailable;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapUnavailable],
    }).compileComponents();

    fixture = TestBed.createComponent(MapUnavailable);
    component = fixture.componentInstance;
  });

  it('renders not-configured variant with role="status" and runbook link', async () => {
    fixture.componentRef.setInput('variant', 'not-configured');
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.map-unavailable-container');
    expect(root.getAttribute('role')).toBe('status');
    expect(root.textContent).toContain('Google Maps Not Configured');
    expect(root.textContent).toContain('public/config.json');

    const link = fixture.nativeElement.querySelector('.runbook-link');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('docs/maps-runbook.md');
  });

  it('renders auth-failed variant with role="alert" and gm_authFailure description', () => {
    fixture.componentRef.setInput('variant', 'auth-failed');
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.map-unavailable-container');
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.textContent).toContain('Maps Authentication Failed');
    expect(root.textContent).toContain('gm_authFailure');
  });

  it('renders network-error variant with Retry button and emits retry on click', () => {
    fixture.componentRef.setInput('variant', 'network-error');
    fixture.detectChanges();

    const retrySpy = vi.fn();
    component.retry.subscribe(retrySpy);

    const root = fixture.nativeElement.querySelector('.map-unavailable-container');
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.textContent).toContain('Network Error Loading Map');

    const retryBtn = fixture.nativeElement.querySelector('button');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.textContent).toContain('Retry loading map');

    retryBtn.click();
    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('renders timeout variant with Retry button', () => {
    fixture.componentRef.setInput('variant', 'timeout');
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.map-unavailable-container');
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.textContent).toContain('Map Load Timed Out');

    const retryBtn = fixture.nativeElement.querySelector('button');
    expect(retryBtn).toBeTruthy();
  });

  it('renders budget-exceeded variant with quota protection message and reload button', () => {
    fixture.componentRef.setInput('variant', 'budget-exceeded');
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.map-unavailable-container');
    expect(root.getAttribute('role')).toBe('alert');
    expect(root.textContent).toContain('protect your Google quota');

    const reloadBtn = fixture.nativeElement.querySelector('button');
    expect(reloadBtn).toBeTruthy();
    expect(reloadBtn.textContent).toContain('Reload page');
  });

  it('renders customMessage when provided', () => {
    fixture.componentRef.setInput('variant', 'network-error');
    fixture.componentRef.setInput('customMessage', 'Custom diagnostic message for network outage.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Custom diagnostic message for network outage.');
  });
});
