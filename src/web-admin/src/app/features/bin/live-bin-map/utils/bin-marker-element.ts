import { Recycle } from 'lucide';
import { BinMapItem } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';
import { getStatusSeverity, StatusSeverity } from './bin-cluster-renderer';

export interface BinMarkerElementOptions {
  selected?: boolean;
  onSelect?: (binId: string) => void;
}

/**
 * Returns the human-readable label text displayed above the bin marker pin.
 * Centralized so the format can be customized or configured (e.g. 'Bin#420' or binId).
 */
export function formatBinMarkerLabel(bin: BinMapItem): string {
  return bin.binId;
}

/**
 * Constructs an accessible title and screen-reader label for a bin marker.
 */
export function buildAccessibleTitle(bin: BinMapItem): string {
  const statusText =
    bin.status === BinStatus.NeedsServicing
      ? 'needs servicing'
      : bin.status === BinStatus.EightyPercentFull
        ? '80% full'
        : bin.status === BinStatus.Offline
          ? 'offline'
          : 'available';
  return `${bin.binId}, ${bin.name}, ${bin.fillLevel}% full, ${statusText}`;
}

/**
 * Pure DOM factory creating the teardrop marker element with label and recycle glyph.
 * Follows strict DOM creation rules (createElement / createElementNS, zero innerHTML).
 */
export function createBinMarkerElement(
  bin: BinMapItem,
  opts?: BinMarkerElementOptions
): HTMLElement {
  const sev: StatusSeverity = getStatusSeverity(bin.status);

  // 1. Root container (role=button, accessible attributes)
  const el = document.createElement('div');
  el.className = `bin-marker marker-${sev}${opts?.selected ? ' marker-selected' : ''}`;
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('data-bin-id', bin.binId);

  const title = buildAccessibleTitle(bin);
  el.setAttribute('aria-label', title);
  el.title = title;

  // 2. Bold label above the pin (textContent only, XSS-safe)
  const label = document.createElement('span');
  label.className = 'bin-marker-label';
  label.textContent = formatBinMarkerLabel(bin);
  el.appendChild(label);

  // 3. SVG pin (32x38 viewBox, bottom-center tip at x=16, y=37)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'bin-marker-pin');
  svg.setAttribute('viewBox', '0 0 32 38');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '38');
  svg.setAttribute('aria-hidden', 'true');

  // 3a. Teardrop path with tip at bottom-center (16, 37)
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  shape.setAttribute('class', 'bin-marker-shape');
  shape.setAttribute(
    'd',
    'M 16 37 C 12 30 2 22 2 15 A 14 14 0 1 1 30 15 C 30 22 20 30 16 37 Z'
  );
  svg.appendChild(shape);

  // 3b. Recycle glyph from Lucide icon node
  const glyphG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  glyphG.setAttribute('class', 'bin-marker-glyph');
  glyphG.setAttribute('transform', 'translate(8, 7) scale(0.66667)');
  glyphG.setAttribute('stroke-width', '2.5');
  glyphG.setAttribute('stroke-linecap', 'round');
  glyphG.setAttribute('stroke-linejoin', 'round');
  glyphG.setAttribute('fill', 'none');

  for (const [tag, attrs] of Recycle) {
    const child = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [attrName, attrVal] of Object.entries(attrs)) {
      child.setAttribute(attrName, String(attrVal));
    }
    glyphG.appendChild(child);
  }
  svg.appendChild(glyphG);

  el.appendChild(svg);

  // 4. Click & keyboard interaction handlers
  if (opts?.onSelect) {
    const handler = (e: Event) => {
      e.stopPropagation();
      opts.onSelect!(bin.binId);
    };

    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        opts.onSelect!(bin.binId);
      }
    });
  }

  return el;
}

/**
 * Updates an existing bin marker element in place without recreating the DOM tree.
 */
export function updateBinMarkerElement(
  el: HTMLElement,
  bin: BinMapItem,
  opts?: { selected?: boolean }
): void {
  const sev = getStatusSeverity(bin.status);
  el.className = `bin-marker marker-${sev}${opts?.selected ? ' marker-selected' : ''}`;
  el.setAttribute('data-bin-id', bin.binId);

  const title = buildAccessibleTitle(bin);
  el.setAttribute('aria-label', title);
  el.title = title;

  const label = el.querySelector<HTMLElement>('.bin-marker-label');
  if (label) {
    label.textContent = formatBinMarkerLabel(bin);
  }
}
