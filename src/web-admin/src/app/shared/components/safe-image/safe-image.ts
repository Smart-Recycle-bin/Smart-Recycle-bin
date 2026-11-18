import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-safe-image',
  imports: [Icon],
  templateUrl: './safe-image.html',
  styleUrl: './safe-image.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafeImage {
  readonly src = input<string | null | undefined>();
  readonly alt = input<string>('');
  readonly imageClass = input<string>('');
  readonly fallbackIcon = input<IconName>('camera');
  readonly fallbackLabel = input<string>('');
  readonly loading = input<'lazy' | 'eager'>('lazy');

  readonly hasError = signal<boolean>(false);

  readonly canRenderImage = computed<boolean>(() => {
    const s = this.src();
    return Boolean(s && !this.hasError());
  });

  onImageError(): void {
    this.hasError.set(true);
  }
}
