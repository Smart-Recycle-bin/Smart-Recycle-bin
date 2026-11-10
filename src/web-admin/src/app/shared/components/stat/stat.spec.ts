import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Stat } from './stat';

describe('Stat', () => {
  let component: Stat;
  let fixture: ComponentFixture<Stat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Stat],
    }).compileComponents();

    fixture = TestBed.createComponent(Stat);
    fixture.componentRef.setInput('title', 'Recycled Tonnage');
    fixture.componentRef.setInput('value', 42.8);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and omit trend block when change is empty', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component).toBeTruthy();
    expect(el.querySelector('.stat-trend-group')).toBeNull();
  });

  it('should apply iconTone class and render comparisonLabel beside change badge', async () => {
    fixture.componentRef.setInput('icon', 'trash');
    fixture.componentRef.setInput('iconTone', 'purple');
    fixture.componentRef.setInput('change', '+12.4%');
    fixture.componentRef.setInput('trend', 'positive');
    fixture.componentRef.setInput('comparisonLabel', 'vs prev. period');
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.stat-icon-wrapper')?.classList.contains('tone-purple')).toBe(true);
    expect(el.textContent).toContain('+12.4%');
    expect(el.textContent).toContain('vs prev. period');
  });
});
