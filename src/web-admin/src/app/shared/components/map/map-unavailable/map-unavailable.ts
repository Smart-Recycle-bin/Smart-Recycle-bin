import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { Button } from '@shared/components/button/button';
import { Icon } from '@shared/components/icon/icon';

export type MapUnavailableVariant =
  | 'not-configured'
  | 'auth-failed'
  | 'network-error'
  | 'timeout'
  | 'budget-exceeded';

interface VariantInfo {
  title: string;
  description: string;
  icon: string;
  role: 'status' | 'alert';
  canRetry: boolean;
  canReload: boolean;
  docLink?: string;
  docLinkLabel?: string;
}

@Component({
  selector: 'app-map-unavailable',
  imports: [Button, Icon],
  templateUrl: './map-unavailable.html',
  styleUrl: './map-unavailable.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapUnavailable {
  readonly variant = input.required<MapUnavailableVariant>();
  readonly customMessage = input<string | null>(null);

  readonly retry = output<void>();

  readonly info = computed<VariantInfo>(() => {
    switch (this.variant()) {
      case 'not-configured':
        return {
          title: 'Google Maps Not Configured',
          description:
            this.customMessage() ??
            'A Google Maps API key is required to render the live bin map. Create a public/config.json file by copying public/config.example.json with your key.',
          icon: 'map-pin',
          role: 'status',
          canRetry: false,
          canReload: false,
          docLink: '/docs/maps-runbook.md',
          docLinkLabel: 'View Maps Runbook (docs/maps-runbook.md)',
        };
      case 'auth-failed':
        return {
          title: 'Maps Authentication Failed',
          description:
            this.customMessage() ??
            'Google Maps rejected the provided API credentials (gm_authFailure). Verify that your key is valid and has Maps JavaScript API enabled in Google Cloud Console.',
          icon: 'alert-triangle',
          role: 'alert',
          canRetry: false,
          canReload: false,
          docLink: '/docs/maps-runbook.md',
          docLinkLabel: 'Troubleshoot in Maps Runbook',
        };
      case 'network-error':
        return {
          title: 'Network Error Loading Map',
          description:
            this.customMessage() ??
            'Unable to reach Google Maps services. Check your network connection or verify that Content Security Policy permits maps.googleapis.com.',
          icon: 'wifi-off',
          role: 'alert',
          canRetry: true,
          canReload: false,
        };
      case 'timeout':
        return {
          title: 'Map Load Timed Out',
          description:
            this.customMessage() ??
            'The map libraries did not finish loading within 15 seconds. Please check your network speed or retry.',
          icon: 'clock',
          role: 'alert',
          canRetry: true,
          canReload: false,
        };
      case 'budget-exceeded':
        return {
          title: 'Map Reload Limit Reached',
          description:
            this.customMessage() ??
            'Map reload limit reached to protect your Google quota. Reload the page to continue.',
          icon: 'shield-alert',
          role: 'alert',
          canRetry: false,
          canReload: true,
        };
    }
  });

  handleReload(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}
