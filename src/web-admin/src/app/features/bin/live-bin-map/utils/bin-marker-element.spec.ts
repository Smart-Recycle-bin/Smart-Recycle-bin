import { describe, it, expect, vi } from 'vitest';
import { BinMapItem } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';
import {
  createBinMarkerElement,
  updateBinMarkerElement,
  formatBinMarkerLabel,
  buildAccessibleTitle,
} from './bin-marker-element';

describe('bin-marker-element', () => {
  const mockBin: BinMapItem = {
    binId: 'BIN-0042',
    name: 'Dokki Central',
    area: 'Dokki',
    district: 'Giza',
    region: 'Greater Cairo',
    latitude: 30.038,
    longitude: 31.212,
    status: BinStatus.Available,
    fillLevel: 45,
    collectorName: 'Ahmed Ali',
    lastServicedAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z',
  };

  it('creates expected DOM hierarchy with label and teardrop SVG pin', () => {
    const el = createBinMarkerElement(mockBin);

    expect(el.tagName.toLowerCase()).toBe('div');
    expect(el.classList.contains('bin-marker')).toBe(true);
    expect(el.classList.contains('marker-success')).toBe(true);
    expect(el.getAttribute('role')).toBe('button');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('data-bin-id')).toBe('BIN-0042');

    // Label span
    const label = el.querySelector<HTMLElement>('.bin-marker-label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('BIN-0042');

    // SVG pin
    const svg = el.querySelector<SVGSVGElement>('svg.bin-marker-pin');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 32 38');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('38');

    // Pin shape
    const shape = svg?.querySelector('path.bin-marker-shape');
    expect(shape).toBeTruthy();
    expect(shape?.getAttribute('d')).toContain('M 16 37');

    // Recycle glyph
    const glyph = svg?.querySelector('g.bin-marker-glyph');
    expect(glyph).toBeTruthy();
    expect(glyph?.children.length).toBeGreaterThan(0);
  });

  it('ensures label text is XSS-safe and does not execute injected HTML', () => {
    const xssBin: BinMapItem = {
      ...mockBin,
      binId: '<img src=x onerror=alert(1)>BIN-XSS',
      name: '<script>alert(2)</script>',
    };

    const el = createBinMarkerElement(xssBin);
    const label = el.querySelector('.bin-marker-label');

    expect(label?.innerHTML).not.toContain('<img');
    expect(label?.textContent).toBe('<img src=x onerror=alert(1)>BIN-XSS');
  });

  it('maps each bin status to its correct severity class', () => {
    const available = createBinMarkerElement({ ...mockBin, status: BinStatus.Available });
    expect(available.classList.contains('marker-success')).toBe(true);

    const warning = createBinMarkerElement({ ...mockBin, status: BinStatus.EightyPercentFull });
    expect(warning.classList.contains('marker-warning')).toBe(true);

    const danger = createBinMarkerElement({ ...mockBin, status: BinStatus.NeedsServicing });
    expect(danger.classList.contains('marker-danger')).toBe(true);

    const offline = createBinMarkerElement({ ...mockBin, status: BinStatus.Offline });
    expect(offline.classList.contains('marker-neutral')).toBe(true);
  });

  it('applies marker-selected class when selected option is true', () => {
    const unselected = createBinMarkerElement(mockBin, { selected: false });
    expect(unselected.classList.contains('marker-selected')).toBe(false);

    const selected = createBinMarkerElement(mockBin, { selected: true });
    expect(selected.classList.contains('marker-selected')).toBe(true);
  });

  it('updates marker element in place without recreating elements', () => {
    const el = createBinMarkerElement(mockBin);
    const originalSvg = el.querySelector('svg.bin-marker-pin');

    const updatedBin: BinMapItem = {
      ...mockBin,
      binId: 'BIN-0042',
      status: BinStatus.NeedsServicing,
      fillLevel: 98,
    };

    updateBinMarkerElement(el, updatedBin, { selected: true });

    expect(el.classList.contains('marker-danger')).toBe(true);
    expect(el.classList.contains('marker-success')).toBe(false);
    expect(el.classList.contains('marker-selected')).toBe(true);
    expect(el.title).toContain('98% full, needs servicing');

    // SVG element must remain strictly the same instance
    expect(el.querySelector('svg.bin-marker-pin')).toBe(originalSvg);
  });

  it('triggers onSelect handler on click and keyboard events (Enter / Space)', () => {
    const onSelect = vi.fn();
    const el = createBinMarkerElement(mockBin, { onSelect });

    // Click
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('BIN-0042');

    // Enter key
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(2);

    // Space key
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(3);

    // Other keys should not fire onSelect
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(onSelect).toHaveBeenCalledTimes(3);
  });
});
