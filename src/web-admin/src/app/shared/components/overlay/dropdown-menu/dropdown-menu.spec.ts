import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownMenu, DropdownMenuItem } from './dropdown-menu';

@Component({
  imports: [DropdownMenu],
  template: `
    <app-dropdown-menu
      [items]="items"
      headerTitle="Admin User"
      headerSubtitle="SYS_ADMIN"
      (itemSelected)="selected.push($event)"
    >
      <button menu-trigger type="button" class="test-trigger">Open Menu</button>
    </app-dropdown-menu>
  `,
})
class HostDropdownTest {
  readonly selected: DropdownMenuItem[] = [];
  readonly items: DropdownMenuItem[] = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'logout', label: 'Sign out', icon: 'log-out', danger: true, dividerBefore: true },
  ];
}

describe('DropdownMenu', () => {
  let fixture: ComponentFixture<HostDropdownTest>;
  let host: HostDropdownTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostDropdownTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostDropdownTest);
    host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should open on trigger click, emit itemSelected, and close on Escape or outside click', async () => {
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('.test-trigger') as HTMLButtonElement;

    trigger.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role="menu"]')).toBeTruthy();

    const items = el.querySelectorAll('[role="menuitem"]');
    expect(items.length).toBe(2);
    expect(items[1].classList.contains('is-danger')).toBe(true);

    (items[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.selected.length).toBe(1);
    expect(host.selected[0].id).toBe('profile');
    expect(el.querySelector('[role="menu"]')).toBeNull();

    // Open again & close with Escape
    trigger.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role="menu"]')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.querySelector('[role="menu"]')).toBeNull();
  });
});
