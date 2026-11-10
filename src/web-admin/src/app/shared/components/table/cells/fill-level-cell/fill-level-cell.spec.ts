import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FillLevelCell } from './fill-level-cell';

describe('FillLevelCell', () => {
  let fixture: ComponentFixture<FillLevelCell>;
  let component: FillLevelCell;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FillLevelCell],
    }).compileComponents();

    fixture = TestBed.createComponent(FillLevelCell);
    component = fixture.componentInstance;
  });

  it('should render ok tone below warning threshold', async () => {
    fixture.componentRef.setInput('value', 34);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.tone()).toBe('ok');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('34%');
  });

  it('should render warning tone at 80+ and danger tone at 95+', async () => {
    fixture.componentRef.setInput('value', 85);
    await fixture.whenStable();
    expect(component.tone()).toBe('warning');

    fixture.componentRef.setInput('value', 97);
    await fixture.whenStable();
    expect(component.tone()).toBe('danger');
  });

  it('should support custom thresholds', async () => {
    fixture.componentRef.setInput('value', 70);
    fixture.componentRef.setInput('warningThreshold', 60);
    fixture.componentRef.setInput('dangerThreshold', 70);
    await fixture.whenStable();
    expect(component.tone()).toBe('danger');
  });
});
