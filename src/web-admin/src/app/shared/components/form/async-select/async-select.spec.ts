import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { AsyncSelect } from './async-select';
import { SelectOption } from '../select/select';

@Component({
  imports: [AsyncSelect, ReactiveFormsModule],
  template: `
    <app-async-select
      [formControl]="control"
      label="Test Picker"
      placeholder="Type to search..."
      [fetcher]="fetchOptions"
      [debounceMs]="200"
    />
  `,
})
class TestHostComponent {
  readonly control = new FormControl<string>('');
  readonly optionsSignal = signal<SelectOption[]>([
    { label: 'Alpha', value: 'opt-1' },
    { label: 'Beta', value: 'opt-2' },
    { label: 'Gamma', value: 'opt-3' },
  ]);

  fetchOptions = (term: string) => {
    const list = this.optionsSignal().filter((o) =>
      o.label.toLowerCase().includes(term.toLowerCase())
    );
    return of(list);
  };
}

describe('AsyncSelect Component', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with WAI-ARIA combobox attributes', () => {
    const inputEl = fixture.nativeElement.querySelector('input[role="combobox"]');
    expect(inputEl).toBeTruthy();
    expect(inputEl.getAttribute('aria-expanded')).toBe('false');
    expect(inputEl.getAttribute('aria-haspopup')).toBe('listbox');
    expect(inputEl.getAttribute('aria-autocomplete')).toBe('list');
  });

  it('opens dropdown and fetches initial options on focus', async () => {
    const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('input[role="combobox"]');
    inputEl.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(inputEl.getAttribute('aria-expanded')).toBe('true');
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]');
    expect(listbox).toBeTruthy();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(options[0].textContent).toContain('Alpha');
  });

  it('debounces typing and updates options list', () => {
    const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('input[role="combobox"]');
    inputEl.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    // Type "bet"
    inputEl.value = 'bet';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    // Not yet debounced
    vi.advanceTimersByTime(100);
    fixture.detectChanges();

    // Fast-forward debounce time
    vi.advanceTimersByTime(150);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('[role="option"]');
    expect(options.length).toBe(1);
    expect(options[0].textContent).toContain('Beta');
  });

  it('navigates with keyboard and selects with Enter', () => {
    const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('input[role="combobox"]');
    inputEl.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    // Arrow down to first option
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(inputEl.getAttribute('aria-activedescendant')).toContain('opt-0');

    // Arrow down to second option
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(inputEl.getAttribute('aria-activedescendant')).toContain('opt-1');

    // Press Enter to select
    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    // Dropdown closed
    expect(inputEl.getAttribute('aria-expanded')).toBe('false');
    expect(host.control.value).toBe('opt-2');
    expect(inputEl.value).toBe('Beta');
  });

  it('closes on Escape without selecting', () => {
    const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('input[role="combobox"]');
    inputEl.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    expect(inputEl.getAttribute('aria-expanded')).toBe('true');

    inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(inputEl.getAttribute('aria-expanded')).toBe('false');
    expect(host.control.value).toBe('');
  });

  it('displays "No results found" when search returns empty array', () => {
    const inputEl: HTMLInputElement = fixture.nativeElement.querySelector('input[role="combobox"]');
    inputEl.dispatchEvent(new Event('focus'));
    fixture.detectChanges();

    inputEl.value = 'zzzz';
    inputEl.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(250);
    fixture.detectChanges();

    const emptyMsg = fixture.nativeElement.querySelector('.empty-message');
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg.textContent).toContain('No results found');
  });
});
