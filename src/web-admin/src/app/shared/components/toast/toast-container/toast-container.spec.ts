import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainer } from './toast-container';
import { ToastService } from '@services/toast/toast.service';

describe('ToastContainer', () => {
  let component: ToastContainer;
  let fixture: ComponentFixture<ToastContainer>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
      providers: [ToastService],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastContainer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    toastService.clearAll();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render active toasts from ToastService', async () => {
    toastService.success('Bin emptied successfully', 'Success');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const titleEl = compiled.querySelector('.toast-title');
    const messageEl = compiled.querySelector('.toast-message');

    expect(titleEl?.textContent).toContain('Success');
    expect(messageEl?.textContent).toContain('Bin emptied successfully');
  });

  it('should dismiss toast when close button is clicked', async () => {
    toastService.info('Temporary notice');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const closeBtn = compiled.querySelector('.toast-close-btn') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    closeBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toastService.toasts().length).toBe(0);
  });
});
