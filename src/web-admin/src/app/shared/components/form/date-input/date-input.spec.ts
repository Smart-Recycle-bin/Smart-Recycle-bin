import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { DateInput, formatIsoDate } from './date-input';

@Component({
  imports: [ReactiveFormsModule, DateInput],
  template: `<app-date-input label="Valid from" [formControl]="ctrl" [displayFormat]="fmt" [required]="true" />`,
})
class HostDateTest {
  readonly ctrl = new FormControl<string | null>(null, [Validators.required]);
  fmt: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd' = 'dd/mm/yyyy';
}

describe('DateInput', () => {
  let fixture: ComponentFixture<HostDateTest>;
  let host: HostDateTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostDateTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostDateTest);
    host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should format ISO date according to displayFormat (default dd/mm/yyyy)', () => {
    expect(formatIsoDate('2025-07-01', 'dd/mm/yyyy')).toBe('01/07/2025');
    expect(formatIsoDate('2025-07-01', 'mm/dd/yyyy')).toBe('07/01/2025');
    expect(formatIsoDate('2025-07-01', 'yyyy-mm-dd')).toBe('2025-07-01');
  });

  it('should integrate with ReactiveForms and display formatted value', async () => {
    const el = fixture.nativeElement as HTMLElement;
    const nativeInput = el.querySelector('input[type="date"]') as HTMLInputElement;
    nativeInput.value = '2025-06-14';
    nativeInput.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.ctrl.value).toBe('2025-06-14');
    expect(el.querySelector('.date-display')?.textContent?.trim()).toBe('14/06/2025');
  });

  it('should show required error when touched empty', async () => {
    const nativeInput = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    nativeInput.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'This field is required.'
    );
  });
});
