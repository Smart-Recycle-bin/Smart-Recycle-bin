import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Select } from './select';

describe('Select', () => {
  let component: Select;
  let fixture: ComponentFixture<Select>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Select],
    }).compileComponents();

    fixture = TestBed.createComponent(Select);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not duplicate the placeholder option when options array already contains an empty value option', async () => {
    fixture.componentRef.setInput('placeholder', 'All districts');
    fixture.componentRef.setInput('options', [
      { label: 'All districts', value: '' },
      { label: 'Cairo', value: 'Cairo' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const selectEl = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const optionEls = selectEl.querySelectorAll('option');
    expect(optionEls.length).toBe(2);
    expect(optionEls[0].textContent?.trim()).toBe('All districts');
    expect(optionEls[1].textContent?.trim()).toBe('Cairo');
  });

  it('renders placeholder option when options array has no empty value option', async () => {
    fixture.componentRef.setInput('placeholder', 'Select a district');
    fixture.componentRef.setInput('options', [
      { label: 'Cairo', value: 'Cairo' },
      { label: 'Giza', value: 'Giza' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const selectEl = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    const optionEls = selectEl.querySelectorAll('option');
    expect(optionEls.length).toBe(3);
    expect(optionEls[0].textContent?.trim()).toBe('Select a district');
  });
});
