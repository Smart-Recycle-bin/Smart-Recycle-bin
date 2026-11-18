import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';
import { BrandLogo, BrandLogoSize } from './brand-logo';

@Component({
  standalone: true,
  imports: [BrandLogo],
  template: `
    <app-brand-logo [compact]="compact()" [size]="size()" />
  `,
})
class TestHostComponent {
  compact = signal(false);
  size = signal<BrandLogoSize>('md');
}

describe('BrandLogo', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders with role="img" and accessible name "EcoBin - Smart Waste Management" by default', () => {
    const el = fixture.nativeElement.querySelector('app-brand-logo');
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('EcoBin - Smart Waste Management');
    expect(el.classList.contains('size-md')).toBe(true);
    expect(el.classList.contains('is-compact')).toBe(false);

    const textElements = el.querySelectorAll('text');
    expect(textElements.length).toBe(2);
    expect(textElements[0].textContent).toContain('EcoBin');
    expect(textElements[1].textContent).toContain('SMART WASTE MANAGEMENT');
  });

  it('renders with accessible name "EcoBin" and omits text when compact', () => {
    host.compact.set(true);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('app-brand-logo');
    expect(el.getAttribute('aria-label')).toBe('EcoBin');
    expect(el.classList.contains('is-compact')).toBe(true);

    const textElements = el.querySelectorAll('text');
    expect(textElements.length).toBe(0);

    const svg = el.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 48 48');
  });

  it('applies requested size host class', () => {
    host.size.set('lg');
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector('app-brand-logo');
    expect(el.classList.contains('size-lg')).toBe(true);

    host.size.set('sm');
    fixture.detectChanges();
    expect(el.classList.contains('size-sm')).toBe(true);
  });
});
