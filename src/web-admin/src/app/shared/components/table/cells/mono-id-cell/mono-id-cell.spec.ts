import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonoIdCell } from './mono-id-cell';

describe('MonoIdCell', () => {
  let fixture: ComponentFixture<MonoIdCell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonoIdCell],
    }).compileComponents();

    fixture = TestBed.createComponent(MonoIdCell);
    fixture.componentRef.setInput('value', 'BIN-0001');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render monospace ID without wrapping', () => {
    const span = (fixture.nativeElement as HTMLElement).querySelector('.mono-id');
    expect(span?.textContent).toBe('BIN-0001');
  });
});
