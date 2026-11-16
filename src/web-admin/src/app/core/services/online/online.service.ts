import { DestroyRef, inject, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OnlineService {
  private readonly destroyRef = inject(DestroyRef);

  readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  constructor() {
    if (typeof window !== 'undefined') {
      const handleOnline = () => this.isOnline.set(true);
      const handleOffline = () => this.isOnline.set(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    }
  }
}
