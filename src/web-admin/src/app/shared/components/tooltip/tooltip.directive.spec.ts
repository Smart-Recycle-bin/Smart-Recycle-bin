import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipDirective } from './tooltip.directive';

@Component({
  imports: [TooltipDirective],
  template: `<button type="button" appTooltip="View telemetry" tooltipPosition="bottom">Info</button>`,
})
class HostTooltipTest {}

describe('TooltipDirective', () => {
  let fixture: ComponentFixture<HostTooltipTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostTooltipTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostTooltipTest);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render tooltip in document body on hover/focus and remove on leave/escape', () => {
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

    btn.dispatchEvent(new Event('mouseenter'));
    const tip = document.body.querySelector('[role="tooltip"]');
    expect(tip).toBeTruthy();
    expect(tip?.textContent).toBe('View telemetry');
    expect(btn.getAttribute('aria-describedby')).toBe(tip?.id);

    btn.dispatchEvent(new Event('mouseleave'));
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

    btn.dispatchEvent(new Event('focusin'));
    expect(document.body.querySelector('[role="tooltip"]')).toBeTruthy();
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
  });
});
