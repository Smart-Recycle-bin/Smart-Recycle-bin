import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinMapItem } from '@models/bin/bin-map.model';
import { BinStatus, BIN_STATUS_LABELS } from '@models/bin/bin-status.enum';
import { Badge, BadgeVariant } from '@shared/components/badge/badge';
import { TooltipDirective } from '@shared/components/tooltip/tooltip.directive';
import { DateTimePipe } from '@shared/pipes/date-time.pipe';
import { Icon } from '@shared/components/icon/icon';

@Component({
  selector: 'app-bin-detail-card',
  standalone: true,
  imports: [CommonModule, Badge, TooltipDirective, DateTimePipe, Icon],
  templateUrl: './bin-detail-card.html',
  styleUrl: './bin-detail-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BinDetailCard {
  readonly bin = input.required<BinMapItem>();
  readonly close = output<void>();

  readonly statusLabel = computed<string>(() => {
    const s = this.bin().status;
    return BIN_STATUS_LABELS[s as BinStatus] ?? String(s);
  });

  readonly badgeVariant = computed<BadgeVariant>(() => {
    const s = this.bin().status;
    switch (s) {
      case BinStatus.Available:
        return 'success';
      case BinStatus.EightyPercentFull:
        return 'warning';
      case BinStatus.NeedsServicing:
        return 'danger';
      case BinStatus.Offline:
      default:
        return 'neutral';
    }
  });

  readonly fillBarClass = computed<string>(() => {
    const s = this.bin().status;
    switch (s) {
      case BinStatus.NeedsServicing:
        return 'fill-danger';
      case BinStatus.EightyPercentFull:
        return 'fill-warning';
      case BinStatus.Available:
        return 'fill-success';
      case BinStatus.Offline:
      default:
        return 'fill-neutral';
    }
  });

  readonly googleMapsDirectionsUrl = computed<string>(() => {
    const lat = this.bin().latitude;
    const lng = this.bin().longitude;
    if (typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng)) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
    }
    return '#';
  });

  onClose(): void {
    this.close.emit();
  }
}
