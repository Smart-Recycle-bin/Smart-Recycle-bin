import { Component, computed, input, signal } from '@angular/core';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'rounded' | 'square';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away' | null;

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
})
export class Avatar {
  readonly name = input<string>('User');
  readonly imageUrl = input<string | null | undefined>();
  readonly size = input<AvatarSize>('md');
  readonly shape = input<AvatarShape>('circle');
  readonly status = input<AvatarStatus>(null);
  readonly alt = input<string>('');

  readonly imageFailed = signal<boolean>(false);

  readonly effectiveAlt = computed(() => this.alt() || this.name() || 'User avatar');

  readonly showImage = computed(() => {
    return !!this.imageUrl() && !this.imageFailed();
  });

  readonly initials = computed(() => {
    const raw = this.name().trim();
    if (!raw) return 'U';
    const parts = raw.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  handleImageError(): void {
    this.imageFailed.set(true);
  }
}
