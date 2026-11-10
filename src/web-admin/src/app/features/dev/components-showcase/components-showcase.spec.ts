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
    component.showToast('success');
    expect(component.toastService.toasts().length).toBe(1);
    component.toastService.clearAll();
    expect(component.toastService.toasts().length).toBe(0);
  });
});
