import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tabs, TabItem } from './tabs';

describe('Tabs', () => {
  let component: Tabs;
  let fixture: ComponentFixture<Tabs>;

  const tabs: TabItem[] = [
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'all', label: 'All-time' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tabs],
    }).compileComponents();

    fixture = TestBed.createComponent(Tabs);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tabs', tabs);
    fixture.componentRef.setInput('activeId', 'weekly');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render tabs and switch active tab via click and keyboard', () => {
    const emitted: string[] = [];
    component.activeChange.subscribe((id) => emitted.push(id));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]');
    expect(buttons[0].getAttribute('aria-selected')).toBe('true');

    (buttons[1] as HTMLButtonElement).click();
    expect(emitted).toEqual(['monthly']);

    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(emitted).toEqual(['monthly', 'all']);
  });
});
