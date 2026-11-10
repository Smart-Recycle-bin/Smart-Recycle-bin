import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLayout } from './admin-layout';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create with Sidebar, Topbar, and RouterOutlet', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-sidebar')).toBeTruthy();
    expect(el.querySelector('app-topbar')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should read navigation sections from ADMIN_NAV_SECTIONS and user from CurrentUserService', () => {
    expect(component.navSections().length).toBeGreaterThan(0);
    expect(component.activeUser().role).toBe('SYS_ADMIN');
  });

  it('should toggle sidebar collapse and mobile drawer', () => {
    expect(component.sidebarCollapsed()).toBe(false);
    component.toggleCollapse();
    expect(component.sidebarCollapsed()).toBe(true);

    expect(component.mobileSidebarOpen()).toBe(false);
    component.toggleMobileSidebar();
    expect(component.mobileSidebarOpen()).toBe(true);
    component.closeMobileSidebar();
    expect(component.mobileSidebarOpen()).toBe(false);
  });
});
