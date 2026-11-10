import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Topbar } from './topbar';
import { ThemeService } from '../../../core/services/theme/theme.service';

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
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme using ThemeService', () => {
    themeService.setTheme('light');
    expect(component.isDarkMode()).toBe(false);

    component.toggleTheme();
    expect(themeService.currentTheme()).toBe('dark');
    expect(component.isDarkMode()).toBe(true);

    component.toggleTheme();
    expect(themeService.currentTheme()).toBe('light');
    expect(component.isDarkMode()).toBe(false);
  });
});
