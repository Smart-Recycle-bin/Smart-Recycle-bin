import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonutChart } from './donut-chart';

describe('DonutChart', () => {
  let component: DonutChart;
  let fixture: ComponentFixture<DonutChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DonutChart],
    }).compileComponents();

    fixture = TestBed.createComponent(DonutChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should render custom centerValue and centerLabel along with right-side legend', async () => {
    fixture.componentRef.setInput('data', [
      { label: 'Contaminated', value: 74, color: 'var(--danger)' },
      { label: 'Accepted', value: 926, color: 'var(--brand)' },
    ]);
    fixture.componentRef.setInput('centerValue', '7.4%');
    fixture.componentRef.setInput('centerLabel', 'rejected');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(component).toBeTruthy();
    expect(el.querySelector('.donut-center-value')?.textContent?.trim()).toBe('7.4%');
    expect(el.querySelector('.donut-center-label')?.textContent?.trim()).toBe('rejected');
    expect(el.querySelectorAll('.legend-item').length).toBe(2);
    expect(el.textContent).toContain('7%');
    expect(el.textContent).toContain('93%');
  });
});
