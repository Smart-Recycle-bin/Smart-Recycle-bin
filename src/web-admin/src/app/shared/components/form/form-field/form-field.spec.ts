import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormField } from './form-field';

describe('FormField', () => {
  let fixture: ComponentFixture<FormField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormField],
    }).compileComponents();

    fixture = TestBed.createComponent(FormField);
    fixture.componentRef.setInput('label', 'Email');
    fixture.componentRef.setInput('required', true);
    fixture.componentRef.setInput('hint', 'Work email');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render label, required asterisk, and hint', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Email');
    expect(el.querySelector('.required-star')?.textContent).toBe('*');
    expect(el.textContent).toContain('Work email');
  });

  it('should prioritize error over hint', async () => {
    fixture.componentRef.setInput('error', 'Email is invalid');
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Email is invalid');
    expect(el.textContent).not.toContain('Work email');
  });
});
