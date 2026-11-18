import { Component, inject } from '@angular/core';
import { ToastService, ToastItem, ToastType } from '@services/toast/toast.service';
import { Icon, IconName } from '@shared/components/icon/icon';

@Component({
  selector: 'app-toast-container',
  imports: [Icon],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainer {
  readonly toastService = inject(ToastService);
  readonly toasts = this.toastService.toasts;

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }

  getIconName(type: ToastType): IconName {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      case 'info':
      default:
        return 'info';
    }
  }

  getAriaRole(type: ToastType): string {
    return type === 'error' ? 'alert' : 'status';
  }

  getAriaLive(type: ToastType): 'assertive' | 'polite' {
    return type === 'error' ? 'assertive' : 'polite';
  }
}
