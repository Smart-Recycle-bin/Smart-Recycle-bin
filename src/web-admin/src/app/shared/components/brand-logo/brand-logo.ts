import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type BrandLogoSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  template: `
    @if (compact()) {
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        fill="none"
        class="brand-logo-svg"
        aria-hidden="true"
      >
        <rect width="48" height="48" rx="12" class="brand-mark-bg" />
        <path
          d="M16 19h16l-1.6 18a2.5 2.5 0 0 1-2.5 2.2h-7.8a2.5 2.5 0 0 1-2.5-2.2L16 19Z"
          stroke-width="2.5"
          stroke-linejoin="round"
          class="brand-mark-fg"
        />
        <path
          d="M13 19h22M20 19v-2.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5V19"
          stroke-width="2.5"
          stroke-linecap="round"
          class="brand-mark-fg"
        />
        <path
          d="M21 25c2-2 5-2 7 0"
          stroke-width="2"
          stroke-linecap="round"
          class="brand-mark-accent"
        />
        <path
          d="M24 31v-3"
          stroke-width="2"
          stroke-linecap="round"
          class="brand-mark-accent"
        />
      </svg>
    } @else {
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 220 48"
        fill="none"
        class="brand-logo-svg"
        aria-hidden="true"
      >
        <!-- Mark -->
        <rect width="48" height="48" rx="12" class="brand-mark-bg" />
        <path
          d="M16 19h16l-1.6 18a2.5 2.5 0 0 1-2.5 2.2h-7.8a2.5 2.5 0 0 1-2.5-2.2L16 19Z"
          stroke-width="2.5"
          stroke-linejoin="round"
          class="brand-mark-fg"
        />
        <path
          d="M13 19h22M20 19v-2.5a1.5 1.5 0 0 1 1.5-1.5h5a1.5 1.5 0 0 1 1.5 1.5V19"
          stroke-width="2.5"
          stroke-linecap="round"
          class="brand-mark-fg"
        />
        <path
          d="M21 25c2-2 5-2 7 0"
          stroke-width="2"
          stroke-linecap="round"
          class="brand-mark-accent"
        />
        <path
          d="M24 31v-3"
          stroke-width="2"
          stroke-linecap="round"
          class="brand-mark-accent"
        />

        <!-- Wordmark with theme variables -->
        <text
          x="58"
          y="27"
          font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          font-size="22"
          font-weight="700"
          letter-spacing="-0.02em"
          class="brand-wordmark"
        >EcoBin</text>

        <!-- Subtitle with theme variables -->
        <text
          x="58"
          y="40"
          font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
          font-size="7.5"
          font-weight="600"
          letter-spacing="0.12em"
          class="brand-subtitle"
        >SMART WASTE MANAGEMENT</text>
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      user-select: none;
    }

    .brand-logo-svg {
      display: block;
      height: 2.25rem;
      width: auto;
      max-width: 100%;
    }

    :host(.size-sm) .brand-logo-svg {
      height: 1.75rem;
    }

    :host(.size-md) .brand-logo-svg {
      height: 2.25rem;
    }

    :host(.size-lg) .brand-logo-svg {
      height: 2.75rem;
    }

    .brand-mark-bg {
      fill: var(--brand-mark-bg);
    }

    .brand-mark-fg {
      stroke: var(--brand-mark-fg);
    }

    .brand-mark-accent {
      stroke: var(--brand-mark-accent);
    }

    .brand-wordmark {
      fill: var(--text);
    }

    .brand-subtitle {
      fill: var(--text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'img',
    '[attr.aria-label]': 'accessibleLabel()',
    '[class.is-compact]': 'compact()',
    '[class.size-sm]': 'size() === "sm"',
    '[class.size-md]': 'size() === "md"',
    '[class.size-lg]': 'size() === "lg"',
  },
})
export class BrandLogo {
  readonly compact = input<boolean>(false);
  readonly size = input<BrandLogoSize>('md');

  readonly accessibleLabel = computed(() =>
    this.compact() ? 'EcoBin' : 'EcoBin - Smart Waste Management'
  );
}
