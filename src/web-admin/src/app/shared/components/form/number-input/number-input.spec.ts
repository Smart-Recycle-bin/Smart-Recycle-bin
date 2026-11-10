import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { NumberInput } from './number-input';

@Component({
  imports: [ReactiveFormsModule, NumberInput],
  template: `<app-number-input label="Points price" [formControl]="ctrl" [min]="10" [max]="1000" [step]="10" [required]="true" />`,
})
class HostNumberTest {
  readonly ctrl = new FormControl<number | null>(null, [Validators.required, Validators.min(10)]);
}

describe('NumberInput', () => {
  let fixture: ComponentFixture<HostNumberTest>;
  let host: HostNumberTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostNumberTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostNumberTest);
    host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should update FormControl value and show validation errors when touched', async () => {
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = '5';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.ctrl.value).toBe(5);
    expect(host.ctrl.invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'Must be at least 10'
    );

    input.value = '250';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.ctrl.value).toBe(250);
    expect(host.ctrl.valid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')).toBeNull();
  });
});
