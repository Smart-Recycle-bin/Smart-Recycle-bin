import { Component, computed, input } from '@angular/core';

export type IconName =
  | 'home'
  | 'dashboard'
  | 'users'
  | 'user'
  | 'settings'
  | 'search'
  | 'bell'
  | 'menu'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'eye'
  | 'eye-off'
  | 'filter'
  | 'download'
  | 'upload'
  | 'check'
  | 'x'
  | 'alert'
  | 'info'
  | 'chart'
  | 'map'
  | 'recycle'
  | 'truck'
  | 'battery'
  | 'wifi'
  | 'more-horizontal'
  | 'sun'
  | 'moon'
  | 'refresh'
  | 'lock'
  | 'log-out'
  | 'shield'
  | 'trending-up'
  | 'trending-down'
  | 'calendar'
  | 'clock'
  | 'check-circle'
  | 'alert-circle'
  | 'x-circle'
  | 'layers'
  | 'activity'
  | 'cpu'
  | 'sparkles'
  | 'external-link';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

const ICON_PATHS: Record<string, string[]> = {
  home: [
    'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V9.5z',
  ],
  dashboard: [
    'M3 3h7v9H3V3z',
    'M14 3h7v5h-7V3z',
    'M14 12h7v9h-7v-9z',
    'M3 16h7v5H3v-5z',
  ],
  users: [
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M23 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  user: [
    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
    'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  ],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  ],
  search: [
    'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
    'M21 21l-4.35-4.35',
  ],
  bell: [
    'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9',
    'M13.73 21a2 2 0 0 1-3.46 0',
  ],
  menu: [
    'M3 12h18',
    'M3 6h18',
    'M3 18h18',
  ],
  'chevron-down': ['M6 9l6 6 6-6'],
  'chevron-up': ['M18 15l-6-6-6 6'],
  'chevron-left': ['M15 18l-6-6 6-6'],
  'chevron-right': ['M9 18l6-6-6-6'],
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  'arrow-right': ['M5 12h14', 'M12 5l7 7-7 7'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7'],
  'arrow-down': ['M12 5v14', 'M19 12l-7 7-7-7'],
  plus: ['M12 5v14', 'M5 12h14'],
  edit: [
    'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7',
    'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  ],
  trash: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'M10 11v6',
    'M14 11v6',
  ],
  eye: [
    'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  ],
  'eye-off': [
    'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24',
    'M1 1l22 22',
  ],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  download: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M7 10l5 5 5-5',
    'M12 15V3',
  ],
  upload: [
    'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
    'M17 8l-5-5-5 5',
    'M12 3v12',
  ],
  check: ['M20 6L9 17l-5-5'],
  x: ['M18 6L6 18', 'M6 6l12 12'],
  alert: [
    'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    'M12 9v4',
    'M12 17h.01',
  ],
  info: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M12 16v-4',
    'M12 8h.01',
  ],
  chart: [
    'M18 20V10',
    'M12 20V4',
    'M6 20v-6',
    'M3 20h18',
  ],
  map: [
    'M1 6v15l7-4 8 4 7-4V2l-7 4-8-4-7 4z',
    'M8 2v15',
    'M16 6v15',
  ],
  recycle: [
    'M7 19H4.81a2 2 0 0 1-1.73-3l1.83-3.17',
    'M11 20.49l-2.06.84a1 1 0 0 1-1.28-.58L6.44 18',
    'M16.5 13l2.87-5a2 2 0 0 0-.29-2.45L17.5 4',
    'M19.78 7.39l1.18 1.9a1 1 0 0 1-.36 1.36L18.4 12',
    'M4.68 10a2 2 0 0 1 .43-2.61L7.5 5.5',
    'M6.22 3.61l2.22.25a1 1 0 0 1 .88.94l.08 2.2',
  ],
  truck: [
    'M1 3h15v13H1z',
    'M16 8h4l3 3v5h-7V8z',
    'M5.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    'M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  ],
  battery: [
    'M2 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
    'M22 11v2',
    'M6 11v2',
    'M10 11v2',
  ],
  wifi: [
    'M5 12.55a11 11 0 0 1 14.08 0',
    'M1.42 9a16 16 0 0 1 21.16 0',
    'M8.53 16.11a6 6 0 0 1 6.95 0',
    'M12 20h.01',
  ],
  'more-horizontal': [
    'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ],
  sun: [
    'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
    'M12 1v2',
    'M12 21v2',
    'M4.22 4.22l1.42 1.42',
    'M18.36 18.36l1.42 1.42',
    'M1 12h2',
    'M21 12h2',
    'M4.22 19.78l1.42-1.42',
    'M18.36 5.64l1.42-1.42',
  ],
  moon: [
    'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  ],
  refresh: [
    'M23 4v6h-6',
    'M1 20v-6h6',
    'M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  ],
  lock: [
    'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z',
    'M7 11V7a5 5 0 0 1 10 0v4',
  ],
  'log-out': [
    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4',
    'M16 17l5-5-5-5',
    'M21 12H9',
  ],
  shield: [
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  ],
  'trending-up': [
    'M23 6l-9.5 9.5-5-5L1 18',
    'M17 6h6v6',
  ],
  'trending-down': [
    'M23 18l-9.5-9.5-5 5L1 6',
    'M17 18h6v-6',
  ],
  calendar: [
    'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z',
    'M16 2v4',
    'M8 2v4',
    'M3 10h18',
  ],
  clock: [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M12 6v6l4 2',
  ],
  'check-circle': [
    'M22 11.08V12a10 10 0 1 1-5.93-9.14',
    'M22 4L12 14.01l-3-3',
  ],
  'alert-circle': [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M12 8v4',
    'M12 16h.01',
  ],
  'x-circle': [
    'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
    'M15 9l-6 6',
    'M9 9l6 6',
  ],
  layers: [
    'M12 2L2 7l10 5 10-5-10-5z',
    'M2 17l10 5 10-5',
    'M2 12l10 5 10-5',
  ],
  activity: [
    'M22 12h-4l-3 9L9 3l-3 9H2',
  ],
  cpu: [
    'M9 9h6v6H9z',
    'M3 9v6h2V9H3z',
    'M19 9v6h2V9h-2z',
    'M9 3v2h6V3H9z',
    'M9 19v2h6v-2H9z',
  ],
  sparkles: [
    'M12 3l1.9 4.8L18.7 9.7l-4.8 1.9L12 16.4l-1.9-4.8L5.3 9.7l4.8-1.9L12 3z',
    'M19 16l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z',
  ],
  'external-link': [
    'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
    'M15 3h6v6',
    'M10 14L21 3',
  ],
};

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input<IconName | string>('info');
  readonly size = input<IconSize>('md');
  readonly color = input<string>('currentColor');
  readonly strokeWidth = input<number>(2);

  readonly pixelSize = computed<number>(() => {
    const s = this.size();
    if (typeof s === 'number') return s;
    switch (s) {
      case 'xs':
        return 14;
      case 'sm':
        return 16;
      case 'md':
        return 20;
      case 'lg':
        return 24;
      case 'xl':
        return 32;
      default:
        return 20;
    }
  });

  readonly paths = computed<string[]>(() => {
    const n = this.name();
    if (ICON_PATHS[n]) {
      return ICON_PATHS[n];
    }
    // graceful fallback
    return ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01'];
  });
}
