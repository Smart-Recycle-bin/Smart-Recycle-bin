import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    service.clearAll();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.toasts().length).toBe(0);
  });

  it('should add a toast and assign unique ID', () => {
    const id = service.show({ message: 'Sensor connected', type: 'success' });
    expect(id).toBeTruthy();
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].message).toBe('Sensor connected');
    expect(service.toasts()[0].type).toBe('success');
  });

  it('should support convenience methods: success, error, warning, info', () => {
    service.success('Success message', 'Success Title');
    service.error('Error message', 'Error Title');
    service.warning('Warning message');
    service.info('Info message');

    const toasts = service.toasts();
    expect(toasts.length).toBe(4);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('Success Title');
    expect(toasts[1].type).toBe('error');
    expect(toasts[2].type).toBe('warning');
    expect(toasts[3].type).toBe('info');
  });

  it('should dismiss toast by id', () => {
    const id1 = service.info('First');
    const id2 = service.info('Second');
    expect(service.toasts().length).toBe(2);

    service.dismiss(id1);
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].id).toBe(id2);
  });

  it('should clear all toasts', () => {
    service.info('One');
    service.info('Two');
    service.info('Three');
    expect(service.toasts().length).toBe(3);

    service.clearAll();
    expect(service.toasts().length).toBe(0);
  });

  it('should automatically dismiss after duration using timers', async () => {
    service.show({ message: 'Auto dismiss', duration: 100 });
    expect(service.toasts().length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(service.toasts().length).toBe(0);
  });

  it('should not automatically dismiss when duration is 0 (persistent)', async () => {
    service.show({ message: 'Persistent toast', duration: 0 });
    expect(service.toasts().length).toBe(1);

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(service.toasts().length).toBe(1);

    service.dismiss(service.toasts()[0].id);
    expect(service.toasts().length).toBe(0);
  });
});
