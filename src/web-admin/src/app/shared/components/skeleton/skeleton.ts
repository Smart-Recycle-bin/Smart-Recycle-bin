import { Component, computed, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type SkeletonAnimation = 'pulse' | 'shimmer' | 'none';

@Component({
  selector: 'app-skeleton',
  imports: [],
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.css',
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('text');
  readonly animation = input<SkeletonAnimation>('pulse');
  readonly width = input<string | number>('100%');
  readonly height = input<string | number>('');
  readonly count = input<number>(1);

  readonly countArray = computed(() => {
    return Array.from({ length: Math.max(1, this.count()) }, (_, i) => i);
  });

  readonly formattedWidth = computed(() => {
    const w = this.width();
    return typeof w === 'number' ? `${w}px` : w;
  });

  readonly formattedHeight = computed(() => {
    const h = this.height();
    if (!h) {
      if (this.variant() === 'text') return '1rem';
      if (this.variant() === 'circular') return this.formattedWidth();
      return '6rem';
    }
    return typeof h === 'number' ? `${h}px` : h;
  });
}
