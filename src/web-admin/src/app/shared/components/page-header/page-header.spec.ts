import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageHeader } from './page-header';

@Component({
  imports: [PageHeader],
  template: `
    <app-page-header
      title="AI Review Queue"
      subtitle="Inspection reports flagged when a recycler rejects a survey."
      backLabel="Back to overview"
      backRoute="/overview"
      statusLabel="Pending"
      statusVariant="warning"
    >
      <button page-actions type="button" class="action-btn">Export</button>
    </app-page-header>
  `,
})
class HostPageHeaderTest {}

describe('PageHeader', () => {
  let fixture: ComponentFixture<HostPageHeaderTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostPageHeaderTest],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostPageHeaderTest);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render title, subtitle, back link, status badge, and projected actions', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('AI Review Queue');
    expect(el.querySelector('.page-subtitle')?.textContent).toContain('Inspection reports');
    expect(el.querySelector('a.back-link')?.getAttribute('href')).toBe('/overview');
    expect(el.querySelector('app-badge')?.textContent).toContain('Pending');
    expect(el.querySelector('.action-btn')?.textContent).toContain('Export');
  });
});
