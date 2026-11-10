import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumberCell } from './number-cell';

describe('NumberCell', () => {
  let fixture: ComponentFixture<NumberCell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberCell],
    }).compileComponents();

    fixture = TestBed.createComponent(NumberCell);
    fixture.componentRef.setInput('value', '+85');
    fixture.componentRef.setInput('tone', 'positive');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render formatted number with tone class', () => {
    const span = (fixture.nativeElement as HTMLElement).querySelector('.number-cell');
    expect(span?.textContent).toBe('+85');
    expect(span?.classList.contains('tone-positive')).toBe(true);
  });
});
