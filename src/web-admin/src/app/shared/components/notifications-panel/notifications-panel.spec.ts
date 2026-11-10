import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationItem, NotificationsPanel } from './notifications-panel';

describe('NotificationsPanel', () => {
  let component: NotificationsPanel;
  let fixture: ComponentFixture<NotificationsPanel>;

  const sampleItems: NotificationItem[] = [
    { id: '1', title: 'Bin full', message: 'BIN-0007 reached 97%', time: '2m ago', unread: true, type: 'danger' },
    { id: '2', title: 'Sync complete', time: '1h ago', unread: false, type: 'success' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsPanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', sampleItems);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render items, emit click/markRead, and emit markAllRead', () => {
    const clicked: NotificationItem[] = [];
    const readIds: string[] = [];
    let allRead = false;

    component.itemClicked.subscribe((i) => clicked.push(i));
    component.markRead.subscribe((id) => readIds.push(id));
    component.markAllRead.subscribe(() => (allRead = true));

    const el = fixture.nativeElement as HTMLElement;
    const rows = el.querySelectorAll('.notif-row');
    expect(rows.length).toBe(2);

    (rows[0] as HTMLButtonElement).click();
    expect(clicked.length).toBe(1);
    expect(readIds).toEqual(['1']);

    (el.querySelector('.mark-all-btn') as HTMLButtonElement).click();
    expect(allRead).toBe(true);
  });

  it('should render empty state when items array is empty', async () => {
    fixture.componentRef.setInput('items', []);
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No notifications');
  });
});
