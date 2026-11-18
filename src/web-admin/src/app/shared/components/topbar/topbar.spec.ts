import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Topbar } from './topbar';
import { ThemeService } from '@services/theme/theme.service';

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;
  let themeService: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [ThemeService],
    }).compileComponents();

    themeService = TestBed.inject(ThemeService);
    fixture = TestBed.createComponent(Topbar);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userName', 'Admin User');
    fixture.componentRef.setInput('userRole', 'SYS_ADMIN');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should create and display two-line user block without breadcrumbs or page title', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.topbar-breadcrumbs')).toBeNull();
    expect(el.querySelector('.topbar-title')).toBeNull();
    expect(el.querySelector('.user-display-name')?.textContent).toContain('Admin User');
    expect(el.querySelector('.user-display-role')?.textContent).toContain('SYS_ADMIN');
  });

  it('should show 9+ when unreadNotifications exceeds 9', async () => {
    fixture.componentRef.setInput('unreadNotifications', 12);
    await fixture.whenStable();
    fixture.detectChanges();
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.notif-badge');
    expect(badge?.textContent?.trim()).toBe('9+');
  });

  it('should toggle theme using ThemeService', () => {
    themeService.setTheme('light');
    expect(component.isDarkMode()).toBe(false);

    component.toggleTheme();
    expect(themeService.currentTheme()).toBe('dark');
    expect(component.isDarkMode()).toBe(true);
  });
});
