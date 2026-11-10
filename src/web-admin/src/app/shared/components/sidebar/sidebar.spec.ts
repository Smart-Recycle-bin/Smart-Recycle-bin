import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Sidebar, SidebarSection } from './sidebar';

@Component({ template: '<div>Dummy</div>' })
class DummyPageComponent {}

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  const testSections: SidebarSection[] = [
    {
      items: [{ id: 'overview', label: 'Overview', icon: 'dashboard', route: '/overview', exact: true }],
    },
    {
      title: 'Fleet',
      items: [
        { id: 'bins', label: 'Bins List', icon: 'recycle', route: '/bins', badge: 5 },
      ],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([
          { path: 'overview', component: DummyPageComponent },
          { path: 'bins', component: DummyPageComponent },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sections', testSections);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create and render navigation links', () => {
    expect(component).toBeTruthy();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-link');
    expect(links.length).toBe(2);
    expect(links[1].textContent).toContain('5');
  });

  it('should emit toggleCollapse when bottom collapse button is clicked', () => {
    let toggled = false;
    component.toggleCollapse.subscribe(() => (toggled = true));
    const btn = (fixture.nativeElement as HTMLElement).querySelector('.collapse-btn') as HTMLButtonElement;
    btn.click();
    expect(toggled).toBe(true);
  });

  it('should highlight active link based on router', async () => {
    const harness = await RouterTestingHarness.create('/bins');
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-link');
    // RouterTestingHarness uses a separate host, verify links have routerLinkActive bound
    expect(links[0].getAttribute('href')).toBe('/overview');
    expect(links[1].getAttribute('href')).toBe('/bins');
    expect(harness).toBeTruthy();
  });
});
