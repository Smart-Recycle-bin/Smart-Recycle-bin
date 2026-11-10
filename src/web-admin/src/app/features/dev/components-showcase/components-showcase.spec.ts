import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComponentsShowcase } from './components-showcase';

describe('ComponentsShowcase', () => {
  let component: ComponentsShowcase;
  let fixture: ComponentFixture<ComponentsShowcase>;

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    await TestBed.configureTestingModule({
      imports: [ComponentsShowcase],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ComponentsShowcase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should create showcase component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme via ThemeService', () => {
    component.setLightMode();
    expect(component.isDark()).toBe(false);
    component.toggleTheme();
    expect(component.isDark()).toBe(true);
  });

  it('should dispatch toasts via ToastService', () => {
    component.showSuccessToast();
    expect(component.toastService.toasts().length).toBe(1);
    component.clearAllToasts();
    expect(component.toastService.toasts().length).toBe(0);
  });

  it('should switch between showcase, foundation, admin-layout-preview, and auth-layout-preview tabs', () => {
    expect(component.activeTab()).toBe('showcase');

    component.activeTab.set('foundation');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Section A: Theme System');

    component.activeTab.set('admin-layout-preview');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-admin-layout')).toBeTruthy();

    component.activeTab.set('auth-layout-preview');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-auth-layout')).toBeTruthy();
  });
});
