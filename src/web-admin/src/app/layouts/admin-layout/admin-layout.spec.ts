import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AdminLayout } from './admin-layout';
import { AuthService } from '../../core/services/auth/auth.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('AdminLayout', () => {
  let component: AdminLayout;
  let fixture: ComponentFixture<AdminLayout>;
  let authServiceSpy: {
    session: ReturnType<typeof signal>;
    logout: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      session: signal(null),
      logout: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

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

  it('should call AuthService.logout() and navigate to /login when userMenuAction is logout', () => {
    component.handleUserMenuAction('logout');

    expect(authServiceSpy.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
