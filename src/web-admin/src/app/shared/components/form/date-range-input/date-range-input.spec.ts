import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DateRangeInput, DateRangeValue } from './date-range-input';

@Component({
  imports: [ReactiveFormsModule, DateRangeInput],
  template: `<app-date-range-input label="Date range" [formControl]="ctrl" />`,
})
class HostDateRangeTest {
  readonly ctrl = new FormControl<DateRangeValue>({ from: null, to: null });
}

describe('DateRangeInput', () => {
  let fixture: ComponentFixture<HostDateRangeTest>;
  let host: HostDateRangeTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostDateRangeTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostDateRangeTest);
    host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should update FormControl with from and to dates', async () => {
    const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="date"]');
    expect(inputs.length).toBe(2);

    (inputs[0] as HTMLInputElement).value = '2025-06-01';
    inputs[0].dispatchEvent(new Event('change'));
    (inputs[1] as HTMLInputElement).value = '2025-06-14';
    inputs[1].dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(host.ctrl.value).toEqual({ from: '2025-06-01', to: '2025-06-14' });
  });

  it('shows error and one-click swap when from date is after to date', async () => {
    host.ctrl.setValue({ from: '2025-06-20', to: '2025-06-10' });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Start date cannot be after end date');

    const swapBtn = el.querySelector('[data-testid="swap-dates-btn"]') as HTMLButtonElement;
    expect(swapBtn).toBeTruthy();

    swapBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.ctrl.value).toEqual({ from: '2025-06-10', to: '2025-06-20' });
    expect(el.textContent).not.toContain('Start date cannot be after end date');
  });
});
