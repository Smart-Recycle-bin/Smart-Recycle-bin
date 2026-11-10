import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SegmentedControl, SegmentedOption } from './segmented-control';

describe('SegmentedControl', () => {
  let component: SegmentedControl;
  let fixture: ComponentFixture<SegmentedControl>;

  const opts: SegmentedOption[] = [
    { label: 'Today', value: 'today' },
    { label: '7d', value: '7d' },
    { label: '30d', value: '30d' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentedControl],
    }).compileComponents();

    fixture = TestBed.createComponent(SegmentedControl);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', opts);
    fixture.componentRef.setInput('value', '7d');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should mark active option and emit valueChange on click and arrow key', () => {
    const emitted: (string | number)[] = [];
    component.valueChange.subscribe((v) => emitted.push(v));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons[1].getAttribute('aria-checked')).toBe('true');

    buttons[2].click();
    expect(emitted).toEqual(['30d']);

    buttons[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(emitted).toEqual(['30d', '7d']);
  });
});
