import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Input } from './input/input';
import { Select, SelectOption } from './select/select';
import { Checkbox } from './checkbox/checkbox';
import { Toggle } from './toggle/toggle';
import { Textarea } from './textarea/textarea';
import { NumberInput } from './number-input/number-input';
import { DateInput } from './date-input/date-input';
import { DateRangeInput, DateRangeValue } from './date-range-input/date-range-input';

@Component({
  imports: [
    ReactiveFormsModule,
    Input,
    Select,
    Checkbox,
    Toggle,
    Textarea,
    NumberInput,
    DateInput,
    DateRangeInput,
  ],
  template: `
    <form [formGroup]="form">
      <app-input label="Full name" formControlName="fullName" [required]="true" />
      <app-input label="Email" type="email" formControlName="email" [required]="true" />
      <app-select label="District" [options]="districts" formControlName="district" [required]="true" />
      <app-checkbox label="Confirm" formControlName="confirmed" [required]="true" />
      <app-toggle label="Active" formControlName="active" />
      <app-textarea label="Notes" formControlName="notes" [required]="true" />
      <app-number-input label="Points" formControlName="points" [min]="1" [required]="true" />
      <app-date-input label="Valid from" formControlName="validFrom" [required]="true" />
      <app-date-range-input label="Window" formControlName="window" />
    </form>
  `,
})
class ReactiveFormHostComponent {
  private readonly fb = inject(FormBuilder);

  readonly districts: SelectOption[] = [
    { label: 'Cairo', value: 'cairo' },
    { label: 'Alexandria', value: 'alex' },
  ];

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    district: ['', [Validators.required]],
    confirmed: [false, [Validators.requiredTrue]],
    active: [true],
    notes: ['', [Validators.required]],
    points: [null as number | null, [Validators.required, Validators.min(10)]],
    validFrom: [null as string | null, [Validators.required]],
    window: [{ from: null, to: null } as DateRangeValue],
  });
}

describe('Reactive Forms Integration', () => {
  let fixture: ComponentFixture<ReactiveFormHostComponent>;
  let host: ReactiveFormHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReactiveFormHostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should show validation errors when markAllAsTouched is called on invalid form', async () => {
    host.form.markAllAsTouched();
    await fixture.whenStable();
    fixture.detectChanges();

    const alerts = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="alert"]');
    expect(alerts.length).toBeGreaterThanOrEqual(6);
    expect(host.form.invalid).toBe(true);
  });

  it('should update FormGroup values when controls change and clear errors when valid', async () => {
    const el = fixture.nativeElement as HTMLElement;

    const fullNameInput = el.querySelector('app-input input') as HTMLInputElement;
    fullNameInput.value = 'Mahmoud Fathy';
    fullNameInput.dispatchEvent(new Event('input'));

    const emailInput = el.querySelectorAll('app-input input')[1] as HTMLInputElement;
    emailInput.value = 'mahmoud@ecobin.eg';
    emailInput.dispatchEvent(new Event('input'));

    const selectEl = el.querySelector('app-select select') as HTMLSelectElement;
    selectEl.value = 'cairo';
    selectEl.dispatchEvent(new Event('change'));

    const checkboxEl = el.querySelector('app-checkbox input[type="checkbox"]') as HTMLInputElement;
    checkboxEl.checked = true;
    checkboxEl.dispatchEvent(new Event('change'));

    const toggleBtn = el.querySelector('app-toggle button[role="switch"]') as HTMLButtonElement;
    toggleBtn.click();

    const textareaEl = el.querySelector('app-textarea textarea') as HTMLTextAreaElement;
    textareaEl.value = 'Provisioned new district collector';
    textareaEl.dispatchEvent(new Event('input'));

    const numberEl = el.querySelector('app-number-input input[type="number"]') as HTMLInputElement;
    numberEl.value = '50';
    numberEl.dispatchEvent(new Event('input'));

    const dateEl = el.querySelector('app-date-input input[type="date"]') as HTMLInputElement;
    dateEl.value = '2025-07-01';
    dateEl.dispatchEvent(new Event('change'));

    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.form.valid).toBe(true);
    expect(host.form.getRawValue()).toEqual({
      fullName: 'Mahmoud Fathy',
      email: 'mahmoud@ecobin.eg',
      district: 'cairo',
      confirmed: true,
      active: false,
      notes: 'Provisioned new district collector',
      points: 50,
      validFrom: '2025-07-01',
      window: { from: null, to: null },
    });
  });

  it('should propagate disabled state from FormGroup to all controls', async () => {
    host.form.disable();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect((el.querySelector('app-input input') as HTMLInputElement).disabled).toBe(true);
    expect((el.querySelector('app-select select') as HTMLSelectElement).disabled).toBe(true);
    expect((el.querySelector('app-checkbox input') as HTMLInputElement).disabled).toBe(true);
    expect((el.querySelector('app-toggle button') as HTMLButtonElement).disabled).toBe(true);
    expect((el.querySelector('app-textarea textarea') as HTMLTextAreaElement).disabled).toBe(true);
    expect((el.querySelector('app-number-input input') as HTMLInputElement).disabled).toBe(true);
  });
});
