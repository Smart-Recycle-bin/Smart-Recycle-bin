import { Injectable, signal, computed } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  title?: string;
  duration?: number; // duration in ms. 0 or negative = persistent
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number; // 0 means persistent
  createdAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly defaultDuration = 4000;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Internal signal holding the array of active toasts.
   */
  private readonly _toasts = signal<ToastItem[]>([]);

  /**
   * Readonly signal of active toasts.
   */
  readonly toasts = this._toasts.asReadonly();

  /**
   * Computed count of active toasts.
   */
  readonly count = computed<number>(() => this._toasts().length);

  /**
   * Shows a toast with the provided options.
   * Returns the generated toast id.
   */
  show(options: ToastOptions): string {
    const id = this.generateId();
    const duration = options.duration !== undefined ? options.duration : this.defaultDuration;
    const type: ToastType = options.type || 'info';

    const item: ToastItem = {
      id,
      type,
      message: options.message,
      title: options.title,
      duration,
      createdAt: Date.now(),
    };

    this._toasts.update((current) => [...current, item]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        this.dismiss(id);
      }, duration);
      this.timers.set(id, timer);
    }

    return id;
  }

  /**
   * Convenience method for a success toast.
   */
  success(message: string, titleOrOptions?: string | Partial<ToastOptions>): string {
    return this.createConvenienceToast('success', message, titleOrOptions);
  }

  /**
   * Convenience method for an error toast.
   */
  error(message: string, titleOrOptions?: string | Partial<ToastOptions>): string {
    return this.createConvenienceToast('error', message, titleOrOptions);
  }

  /**
   * Convenience method for a warning toast.
   */
  warning(message: string, titleOrOptions?: string | Partial<ToastOptions>): string {
    return this.createConvenienceToast('warning', message, titleOrOptions);
  }

  /**
   * Convenience method for an info toast.
   */
  info(message: string, titleOrOptions?: string | Partial<ToastOptions>): string {
    return this.createConvenienceToast('info', message, titleOrOptions);
  }

  /**
   * Dismisses an individual toast by its ID and cleans up its timer.
   */
  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this._toasts.update((current) => current.filter((t) => t.id !== id));
  }

  /**
   * Clears all active toasts and cancels all pending timers.
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this._toasts.set([]);
  }

  private createConvenienceToast(
    type: ToastType,
    message: string,
    titleOrOptions?: string | Partial<ToastOptions>
  ): string {
    if (typeof titleOrOptions === 'string') {
      return this.show({
        type,
        message,
        title: titleOrOptions,
      });
    }

    return this.show({
      type,
      message,
      ...titleOrOptions,
    });
  }

  private generateId(): string {
    return 'toast-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }
}
