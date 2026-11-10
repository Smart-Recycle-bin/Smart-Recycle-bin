import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AreaChart } from './area-chart';

describe('AreaChart', () => {
  let component: AreaChart;
  let fixture: ComponentFixture<AreaChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AreaChart],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and plot single-series data with compact axis labels', async () => {
    fixture.componentRef.setInput('data', [
      { label: 'Mon', value: 0 },
      { label: 'Tue', value: 4500 },
      { label: 'Wed', value: 9400 },
    ]);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component).toBeTruthy();
    expect(text).toContain('k');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('path.series-line').length).toBe(1);
  });

  it('should render multi-series legend, paths, and hover tooltip for all series', async () => {
    fixture.componentRef.setInput('series', [
      {
        name: 'Accepted',
        color: 'var(--brand)',
        points: [
          { label: 'Day 1', value: 120 },
          { label: 'Day 2', value: 240 },
        ],
      },
      {
        name: 'Rejected',
        color: 'var(--danger)',
        points: [
          { label: 'Day 1', value: 15 },
          { label: 'Day 2', value: 18 },
        ],
      },
    ]);
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.legend-entry').length).toBe(2);
    expect(el.querySelectorAll('path.series-line').length).toBe(2);

    component.onPointHover(1);
    await fixture.whenStable();

    const tooltip = el.querySelector('.chart-tooltip-card');
    expect(tooltip).toBeTruthy();
    expect(tooltip?.textContent).toContain('Accepted');
    expect(tooltip?.textContent).toContain('240');
    expect(tooltip?.textContent).toContain('Rejected');
    expect(tooltip?.textContent).toContain('18');
  });
});
