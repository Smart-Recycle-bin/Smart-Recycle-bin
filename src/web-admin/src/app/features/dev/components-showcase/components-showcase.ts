import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ThemeService } from '../../../core/services/theme/theme.service';
import { ToastService } from '../../../core/services/toast/toast.service';

import { Button } from '../../../shared/components/button/button';
import { IconButton } from '../../../shared/components/button/icon-button/icon-button';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Badge } from '../../../shared/components/badge/badge';
import { Card } from '../../../shared/components/card/card';
import { Icon, IconName } from '../../../shared/components/icon/icon';

import { Stat } from '../../../shared/components/stat/stat';
import { Progress } from '../../../shared/components/progress/progress';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { Notice } from '../../../shared/components/notice/notice';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { PageHeader } from '../../../shared/components/page-header/page-header';

import { Input } from '../../../shared/components/form/input/input';
import { SearchInput } from '../../../shared/components/form/search-input/search-input';
import { Select, SelectOption } from '../../../shared/components/form/select/select';
import { Checkbox } from '../../../shared/components/form/checkbox/checkbox';
import { Toggle } from '../../../shared/components/form/toggle/toggle';
import { Textarea } from '../../../shared/components/form/textarea/textarea';

import { Modal } from '../../../shared/components/overlay/modal/modal';
import { Drawer } from '../../../shared/components/overlay/drawer/drawer';
import { ConfirmDialog } from '../../../shared/components/overlay/confirm-dialog/confirm-dialog';

import { DataTable, TableAction, TableColumn } from '../../../shared/components/table/data-table/data-table';
import { AreaChart, AreaChartPoint } from '../../../shared/components/charts/area-chart/area-chart';
import { BarList, BarListItem } from '../../../shared/components/charts/bar-list/bar-list';
import { DonutChart, DonutSegment } from '../../../shared/components/charts/donut-chart/donut-chart';
import { Gauge } from '../../../shared/components/charts/gauge/gauge';

import { MapMarker, MapView } from '../../../shared/components/map/map-view/map-view';
import { Sidebar, SidebarSection } from '../../../shared/components/sidebar/sidebar';
import { Topbar } from '../../../shared/components/topbar/topbar';

@Component({
  selector: 'app-components-showcase',
  imports: [
    RouterLink,
    Button,
    IconButton,
    Avatar,
    Badge,
    Card,
    Icon,
    Stat,
    Progress,
    Skeleton,
    Notice,
    EmptyState,
    ErrorState,
    PageHeader,
    Input,
    SearchInput,
    Select,
    Checkbox,
    Toggle,
    Textarea,
    Modal,
    Drawer,
    ConfirmDialog,
    DataTable,
    AreaChart,
    BarList,
    DonutChart,
    Gauge,
    MapView,
    Sidebar,
    Topbar,
  ],
  templateUrl: './components-showcase.html',
  styleUrl: './components-showcase.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentsShowcase {
  readonly themeService = inject(ThemeService);
  readonly toastService = inject(ToastService);

  readonly currentTheme = this.themeService.currentTheme;
  readonly isDark = this.themeService.isDark;

  readonly selectedCategory = signal<string>('all');
  readonly clickCount = signal<number>(0);
  readonly lastActionMessage = signal<string>('Ready for interaction');

  readonly demoInputValue = signal<string>('EcoBin-001');
  readonly demoPasswordValue = signal<string>('demo-secret');
  readonly demoSearchValue = signal<string>('');
  readonly demoSelectValue = signal<string | number>('plastics');
  readonly demoCheckbox1 = signal<boolean>(true);
  readonly demoCheckbox2 = signal<boolean>(false);
  readonly demoToggle1 = signal<boolean>(true);
  readonly demoToggle2 = signal<boolean>(false);
  readonly demoTextareaValue = signal<string>('Calibration notes sample.');

  readonly isModalOpen = signal<boolean>(false);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isConfirmOpen = signal<boolean>(false);
  readonly confirmLoading = signal<boolean>(false);
  readonly dynamicGaugeValue = signal<number>(76);

  readonly materialOptions: SelectOption[] = [
    { label: 'Plastics (PET / HDPE)', value: 'plastics' },
    { label: 'Paper & Cardboard', value: 'paper' },
    { label: 'Glass Containers', value: 'glass' },
    { label: 'Metals', value: 'metals' },
  ];

  readonly tonnageData: AreaChartPoint[] = [
    { label: 'Mon', value: 24.5 },
    { label: 'Tue', value: 31.2 },
    { label: 'Wed', value: 28.7 },
    { label: 'Thu', value: 42.1 },
    { label: 'Fri', value: 38.9 },
    { label: 'Sat', value: 54.3 },
    { label: 'Sun', value: 48.6 },
  ];

  readonly materialBarData: BarListItem[] = [
    { label: 'PET Plastics', value: 1420, color: '#009966', formattedValue: '1,420 kg' },
    { label: 'Cardboard', value: 2150, color: '#0ea5e9', formattedValue: '2,150 kg' },
    { label: 'Glass', value: 980, color: '#f59e0b', formattedValue: '980 kg' },
    { label: 'Metals', value: 640, color: '#8b5cf6', formattedValue: '640 kg' },
  ];

  readonly wasteComposition: DonutSegment[] = [
    { label: 'Plastics', value: 38, color: '#009966' },
    { label: 'Paper', value: 28, color: '#0ea5e9' },
    { label: 'Glass', value: 18, color: '#f59e0b' },
    { label: 'Metals', value: 16, color: '#8b5cf6' },
  ];

  readonly tableColumns: TableColumn[] = [
    { key: 'code', label: 'ID', sortable: true, width: '120px' },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'fillLevel', label: 'Fill', sortable: true, width: '100px' },
    { key: 'status', label: 'Status', type: 'badge', sortable: true, width: '130px' },
  ];

  readonly tableData = signal<Record<string, any>[]>([
    { id: '1', code: 'BIN-0001', location: 'Zone A', fillLevel: '96%', status: 'Critical' },
    { id: '2', code: 'BIN-0002', location: 'Zone B', fillLevel: '68%', status: 'Warning' },
    { id: '3', code: 'BIN-0003', location: 'Zone C', fillLevel: '32%', status: 'Active' },
  ]);

  readonly tableActions: TableAction[] = [
    { id: 'view', icon: 'eye', label: 'View' },
    { id: 'delete', icon: 'trash', label: 'Archive', variant: 'danger' },
  ];

  readonly mapMarkers: MapMarker[] = [
    { id: 'm1', label: 'Bin #1', x: 28, y: 32, status: 'critical', type: 'bin', capacity: 96, battery: 88 },
    { id: 'm2', label: 'Bin #2', x: 65, y: 24, status: 'warning', type: 'bin', capacity: 82, battery: 95 },
    { id: 'm3', label: 'Bin #3', x: 75, y: 65, status: 'online', type: 'bin', capacity: 32, battery: 74 },
  ];

  readonly previewSidebarSections: SidebarSection[] = [
    {
      title: 'Navigation',
      items: [
        { id: 'overview', label: 'Overview', icon: 'dashboard' },
        { id: 'bins', label: 'Bins List', icon: 'recycle', badge: '5', badgeVariant: 'warning' },
      ],
    },
  ];

  readonly showcaseIcons: IconName[] = [
    'recycle',
    'dashboard',
    'map',
    'chart',
    'truck',
    'battery',
    'wifi',
    'bell',
    'search',
    'settings',
    'users',
    'user',
    'plus',
    'edit',
    'trash',
    'eye',
    'filter',
    'download',
    'upload',
    'check',
    'x',
    'alert',
    'info',
    'refresh',
    'lock',
    'shield',
    'trending-up',
    'calendar',
    'clock',
    'check-circle',
    'sparkles',
    'activity',
  ];

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.lastActionMessage.set(`Theme: ${this.currentTheme()}`);
  }

  setLightMode(): void {
    this.themeService.setTheme('light');
    this.lastActionMessage.set('Theme: light');
  }

  setDarkMode(): void {
    this.themeService.setTheme('dark');
    this.lastActionMessage.set('Theme: dark');
  }

  showToast(type: 'success' | 'error' | 'warning' | 'info'): void {
    this.toastService[type](`Sample ${type} notification from showcase`, `${type.toUpperCase()} Toast`);
  }

  incrementClick(): void {
    this.clickCount.update((c) => c + 1);
    const msg = `Clicked ${this.clickCount()} times`;
    this.lastActionMessage.set(msg);
    this.toastService.info(msg);
  }

  handleTableAction(event: { action: string; row: Record<string, any> }): void {
    this.toastService.info(`Action '${event.action}' on ${event.row['code']}`);
  }

  handleMapMarkerClick(marker: MapMarker): void {
    this.toastService.info(`Selected ${marker.label} (${marker.status})`);
  }

  onConfirmAction(): void {
    this.confirmLoading.set(true);
    setTimeout(() => {
      this.confirmLoading.set(false);
      this.isConfirmOpen.set(false);
      this.toastService.success('Action confirmed');
    }, 300);
  }

  onCancelConfirm(): void {
    this.isConfirmOpen.set(false);
    this.toastService.info('Action cancelled');
  }

  updateGauge(delta: number): void {
    this.dynamicGaugeValue.update((v) => Math.max(0, Math.min(100, v + delta)));
  }

  filterCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  isCategoryVisible(cat: string): boolean {
    const sel = this.selectedCategory();
    return sel === 'all' || sel === cat;
  }
}
