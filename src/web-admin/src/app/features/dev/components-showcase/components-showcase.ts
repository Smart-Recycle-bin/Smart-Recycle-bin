import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

// Core Services
import { ThemeService } from '../../../core/services/theme/theme.service';
import { ToastService } from '../../../core/services/toast/toast.service';

// 1. Foundational
import { Button } from '../../../shared/components/button/button';
import { IconButton } from '../../../shared/components/button/icon-button/icon-button';
import { Avatar } from '../../../shared/components/avatar/avatar';
import { Badge } from '../../../shared/components/badge/badge';
import { Card } from '../../../shared/components/card/card';
import { Icon, IconName } from '../../../shared/components/icon/icon';

// 2. Feedback & States
import { Stat } from '../../../shared/components/stat/stat';
import { Progress } from '../../../shared/components/progress/progress';
import { Skeleton } from '../../../shared/components/skeleton/skeleton';
import { Notice } from '../../../shared/components/notice/notice';
import { EmptyState } from '../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../shared/components/error-state/error-state';
import { PageHeader } from '../../../shared/components/page-header/page-header';

// 3. Form Controls
import { Input } from '../../../shared/components/form/input/input';
import { SearchInput } from '../../../shared/components/form/search-input/search-input';
import { Select, SelectOption } from '../../../shared/components/form/select/select';
import { Checkbox } from '../../../shared/components/form/checkbox/checkbox';
import { Toggle } from '../../../shared/components/form/toggle/toggle';
import { Textarea } from '../../../shared/components/form/textarea/textarea';

// 4. Overlays
import { Modal } from '../../../shared/components/overlay/modal/modal';
import { Drawer } from '../../../shared/components/overlay/drawer/drawer';
import { ConfirmDialog } from '../../../shared/components/overlay/confirm-dialog/confirm-dialog';

// 5. Data & Charts
import { BadgeVariant } from '../../../shared/components/badge/badge';
import { DataTable, TableAction, TableColumn } from '../../../shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/table/data-table/cell-template.directive';
import { UserCell } from '../../../shared/components/table/cells/user-cell/user-cell';
import { FillLevelCell } from '../../../shared/components/table/cells/fill-level-cell/fill-level-cell';
import { MonoIdCell } from '../../../shared/components/table/cells/mono-id-cell/mono-id-cell';
import { NumberCell } from '../../../shared/components/table/cells/number-cell/number-cell';
import { Pagination } from '../../../shared/components/table/pagination/pagination';
import { AreaChart, AreaChartPoint } from '../../../shared/components/charts/area-chart/area-chart';
import { BarList, BarListItem } from '../../../shared/components/charts/bar-list/bar-list';
import { DonutChart, DonutSegment } from '../../../shared/components/charts/donut-chart/donut-chart';
import { Gauge } from '../../../shared/components/charts/gauge/gauge';

// 6. IoT & Navigation
import { MapMarker, MapView } from '../../../shared/components/map/map-view/map-view';
import { Sidebar, SidebarSection } from '../../../shared/components/sidebar/sidebar';
import { Topbar } from '../../../shared/components/topbar/topbar';

// 7. Layouts
import { AdminLayout } from '../../../layouts/admin-layout/admin-layout';
import { AuthLayout } from '../../../layouts/auth-layout/auth-layout';

interface ShowcaseBinRow {
  id: string;
  code: string;
  location: string;
  district: string;
  fill: number;
  pointsDelta: string;
  collector: string;
  collectorId: string;
  status: 'AVAILABLE' | '≥80% FULL' | '≥95% FULL' | 'Inactive' | 'Sent to Retraining';
}

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
    CellTemplateDirective,
    UserCell,
    FillLevelCell,
    MonoIdCell,
    NumberCell,
    Pagination,
    AreaChart,
    BarList,
    DonutChart,
    Gauge,
    MapView,
    Sidebar,
    Topbar,
    AdminLayout,
    AuthLayout,
  ],
  templateUrl: './components-showcase.html',
  styleUrl: './components-showcase.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentsShowcase {
  readonly themeService = inject(ThemeService);
  readonly toastService = inject(ToastService);

  // Global Navigation State (includes admin-layout-preview and auth-layout-preview tabs)
  readonly activeTab = signal<'foundation' | 'showcase' | 'admin-layout-preview' | 'auth-layout-preview'>('showcase');
  readonly selectedCategory = signal<string>('all');

  // Reactive theme states from ThemeService
  readonly currentTheme = this.themeService.currentTheme;
  readonly isDark = this.themeService.isDark;

  // Interactive Component Demo State
  readonly clickCount = signal<number>(0);
  readonly lastActionMessage = signal<string>('Ready for interaction');

  // Form Controls Demo State
  readonly demoInputValue = signal<string>('Smart Bin Alpha-104');
  readonly demoPasswordValue = signal<string>('sensor-token-9842');
  readonly demoSearchValue = signal<string>('Park Central');
  readonly demoSelectValue = signal<string | number>('plastics');
  readonly demoCheckbox1 = signal<boolean>(true);
  readonly demoCheckbox2 = signal<boolean>(false);
  readonly demoToggle1 = signal<boolean>(true);
  readonly demoToggle2 = signal<boolean>(false);
  readonly demoTextareaValue = signal<string>(
    'Scheduled ultrasonic calibration and battery swap for high-traffic recycling hub.'
  );

  // Overlay Demo State
  readonly isModalOpen = signal<boolean>(false);
  readonly isDrawerOpen = signal<boolean>(false);
  readonly isConfirmOpen = signal<boolean>(false);
  readonly confirmLoading = signal<boolean>(false);

  // Gauge Demo Interactive Slider
  readonly dynamicGaugeValue = signal<number>(82);

  // Select Options
  readonly materialOptions: SelectOption[] = [
    { label: 'Plastics (PET / HDPE)', value: 'plastics' },
    { label: 'Paper & Cardboard', value: 'paper' },
    { label: 'Glass Containers', value: 'glass' },
    { label: 'Aluminium & Metals', value: 'metals' },
    { label: 'Electronic Waste (E-waste)', value: 'ewaste' },
    { label: 'Organic Compost', value: 'organic', disabled: true },
  ];

  // Sample Data: Area Chart (Daily Tonnage)
  readonly tonnageData: AreaChartPoint[] = [
    { label: 'Mon', value: 24.5 },
    { label: 'Tue', value: 31.2 },
    { label: 'Wed', value: 28.7 },
    { label: 'Thu', value: 42.1 },
    { label: 'Fri', value: 38.9 },
    { label: 'Sat', value: 54.3 },
    { label: 'Sun', value: 48.6 },
  ];

  // Sample Data: Bar List (Collection by Material)
  readonly materialBarData: BarListItem[] = [
    { label: 'PET Plastics', value: 1420, color: '#009966', formattedValue: '1,420 kg' },
    { label: 'Cardboard & Paper', value: 2150, color: '#0ea5e9', formattedValue: '2,150 kg' },
    { label: 'Clear & Amber Glass', value: 980, color: '#f59e0b', formattedValue: '980 kg' },
    { label: 'Aluminium Cans', value: 640, color: '#8b5cf6', formattedValue: '640 kg' },
    { label: 'E-Waste Devices', value: 310, color: '#ec4899', formattedValue: '310 kg' },
  ];

  // Sample Data: Donut Chart (Waste Composition)
  readonly wasteComposition: DonutSegment[] = [
    { label: 'Plastics', value: 38, color: '#009966' },
    { label: 'Paper', value: 28, color: '#0ea5e9' },
    { label: 'Glass', value: 18, color: '#f59e0b' },
    { label: 'Metals', value: 11, color: '#8b5cf6' },
    { label: 'Other', value: 5, color: '#94a3b8' },
  ];

  // Sample Data: IoT Bins Table
  readonly tableRowId = (row: ShowcaseBinRow) => row.id;

  readonly statusBadgeMap: Record<ShowcaseBinRow['status'], BadgeVariant> = {
    AVAILABLE: 'success',
    '≥80% FULL': 'warning',
    '≥95% FULL': 'danger',
    Inactive: 'neutral',
    'Sent to Retraining': 'purple',
  };

  readonly tableColumns: TableColumn<ShowcaseBinRow>[] = [
    { key: 'code', label: 'Bin ID', sortable: true, width: '120px', nowrap: true },
    { key: 'location', label: 'Location', sortable: true },
    { key: 'collector', label: 'Collector', sortable: true },
    { key: 'fill', label: 'Fill Level', sortable: true, width: '160px' },
    { key: 'pointsDelta', label: 'Points', align: 'right', width: '100px' },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      sortable: true,
      width: '150px',
      badgeVariant: (row) => this.statusBadgeMap[row.status],
    },
  ];

  readonly tableData = signal<ShowcaseBinRow[]>([
    {
      id: 'BIN-0001',
      code: 'BIN-0001',
      location: 'Central Plaza',
      district: 'Cairo',
      fill: 97,
      pointsDelta: '+85',
      collector: 'Mahmoud Fathy',
      collectorId: 'C-001 · Cairo',
      status: '≥95% FULL',
    },
    {
      id: 'BIN-0002',
      code: 'BIN-0002',
      location: 'Green Valley Station',
      district: 'Giza',
      fill: 85,
      pointsDelta: '+60',
      collector: 'Hossam El-Din',
      collectorId: 'C-002 · Cairo',
      status: '≥80% FULL',
    },
    {
      id: 'BIN-0003',
      code: 'BIN-0003',
      location: 'Tech Park Bldg 4',
      district: 'Cairo',
      fill: 34,
      pointsDelta: '+72',
      collector: 'Karim Abdelrahman',
      collectorId: 'C-003 · Giza',
      status: 'AVAILABLE',
    },
    {
      id: 'BIN-0004',
      code: 'BIN-0004',
      location: 'North Waterfront Pier',
      district: 'Alexandria',
      fill: 45,
      pointsDelta: '-420',
      collector: 'Youssef Salama',
      collectorId: 'C-004 · Qalyubia',
      status: 'Sent to Retraining',
    },
    {
      id: 'BIN-0005',
      code: 'BIN-0005',
      location: 'South District Depot',
      district: 'Alexandria',
      fill: 12,
      pointsDelta: '0',
      collector: 'Waleed Nagy',
      collectorId: 'C-006 · Alexandria',
      status: 'Inactive',
    },
  ]);

  readonly tableActions: TableAction<ShowcaseBinRow>[] = [
    { id: 'view', icon: 'eye', label: 'View Telemetry' },
    { id: 'empty', icon: 'refresh', label: 'Schedule Empty' },
    { id: 'alert', icon: 'alert', label: 'Flag Incident', variant: 'danger' },
  ];

  // Sample Data: Schematic Map Markers
  readonly mapMarkers: MapMarker[] = [
    {
      id: 'm1',
      label: 'EcoBin #101',
      x: 28,
      y: 32,
      status: 'critical',
      type: 'bin',
      capacity: 94,
      battery: 88,
      lastUpdated: '1m ago',
      address: 'Central Plaza North Corridor',
    },
    {
      id: 'm2',
      label: 'EcoBin #102',
      x: 65,
      y: 22,
      status: 'warning',
      type: 'bin',
      capacity: 68,
      battery: 95,
      lastUpdated: '3m ago',
      address: 'Green Valley Transit Hub',
    },
    {
      id: 'm3',
      label: 'EcoBin #103',
      x: 75,
      y: 65,
      status: 'online',
      type: 'bin',
      capacity: 32,
      battery: 74,
      lastUpdated: 'Just now',
      address: 'Tech District Bldg 4',
    },
    {
      id: 'm4',
      label: 'Truck #04 (En Route)',
      x: 48,
      y: 45,
      status: 'online',
      type: 'truck',
      capacity: 72,
      battery: 99,
      lastUpdated: 'Moving 34 km/h',
      address: 'Emerald Avenue Westbound',
    },
    {
      id: 'm5',
      label: 'EcoBin #105',
      x: 82,
      y: 84,
      status: 'offline',
      type: 'bin',
      capacity: 12,
      battery: 15,
      lastUpdated: '2h ago (No Signal)',
      address: 'Industrial Recycling Yard',
    },
    {
      id: 'm6',
      label: 'Sorting Depot Central',
      x: 22,
      y: 72,
      status: 'online',
      type: 'station',
      capacity: 45,
      battery: 100,
      lastUpdated: 'Station Active',
      address: 'South Waste Logistics Depot',
    },
  ];

  // Sidebar Preview Sections
  readonly previewSidebarSections: SidebarSection[] = [
    {
      items: [
        { id: 'overview', label: 'Overview', icon: 'dashboard', route: '/overview', exact: true },
      ],
    },
    {
      title: 'Fleet Management',
      items: [
        { id: 'bins', label: 'Bins List', icon: 'recycle', route: '/bins', badge: 5 },
        { id: 'map', label: 'Live Bin Map', icon: 'map', route: '/bins/map' },
      ],
    },
  ];

  // Common Icons List for Display
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

  // --- Section A: ThemeService Test Controls ---
  setLightMode(): void {
    this.themeService.setTheme('light');
    this.lastActionMessage.set('Theme set to Light');
  }

  setDarkMode(): void {
    this.themeService.setTheme('dark');
    this.lastActionMessage.set('Theme set to Dark');
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
    this.lastActionMessage.set(`Theme toggled to ${this.currentTheme()}`);
  }

  // --- Section B: ToastService Test Controls ---
  showSuccessToast(): void {
    this.toastService.success(
      'Bin #104 ultrasonic fill level telemetry updated successfully.',
      'Telemetry Synchronized'
    );
    this.lastActionMessage.set('Success toast triggered');
  }

  showErrorToast(): void {
    this.toastService.error(
      'Connection failed for sensor gateway GW-992. Check battery or mesh repeater.',
      'Sensor Gateway Offline'
    );
    this.lastActionMessage.set('Error toast triggered');
  }

  showWarningToast(): void {
    this.toastService.warning(
      'Bin #101 fill level reached 94% capacity. Schedule route collection soon.',
      'High Capacity Warning'
    );
    this.lastActionMessage.set('Warning toast triggered');
  }

  showInfoToast(): void {
    this.toastService.info(
      'Route optimization algorithm completed for South District fleet.',
      'Fleet Route Updated'
    );
    this.lastActionMessage.set('Info toast triggered');
  }

  showMultipleToasts(): void {
    this.toastService.info('Analyzing smart bin fleet network...', 'Step 1/3');
    setTimeout(() => {
      this.toastService.warning('Detected 3 bins nearing threshold.', 'Step 2/3');
    }, 250);
    setTimeout(() => {
      this.toastService.success('Dispatched optimal collection path to Truck #04.', 'Step 3/3');
    }, 500);
    this.lastActionMessage.set('Multiple toasts triggered');
  }

  showPersistentToast(): void {
    this.toastService.show({
      type: 'warning',
      title: 'Persistent System Alert',
      message: 'Firmware upgrade is currently in progress. This notification will not auto-dismiss.',
      duration: 0,
    });
    this.lastActionMessage.set('Persistent toast triggered');
  }

  clearAllToasts(): void {
    this.toastService.clearAll();
    this.lastActionMessage.set('All toasts cleared');
  }

  // --- Interactive Showcase Controls ---
  incrementClick(): void {
    this.clickCount.update((c) => c + 1);
    const msg = `Interactive button clicked (${this.clickCount()} times)`;
    this.lastActionMessage.set(msg);
    this.toastService.info(msg);
  }

  handleTableAction(event: { action: string; row: ShowcaseBinRow }): void {
    const msg = `Table Action '${event.action}' triggered for ${event.row.code}`;
    this.lastActionMessage.set(msg);
    if (event.action === 'alert') {
      this.toastService.error(msg, 'Incident Flagged');
    } else {
      this.toastService.info(msg);
    }
  }

  handleTableRowClick(row: ShowcaseBinRow): void {
    const msg = `Row clicked: ${row.code} (${row.location})`;
    this.lastActionMessage.set(msg);
    this.toastService.info(msg);
  }

  handleMapMarkerClick(marker: MapMarker): void {
    const msg = `Selected: ${marker.label} (${marker.status.toUpperCase()})`;
    this.lastActionMessage.set(msg);
    if (marker.status === 'critical') {
      this.toastService.error(`Bin capacity at ${marker.capacity}%. Immediate dispatch required.`, marker.label);
    } else if (marker.status === 'warning') {
      this.toastService.warning(`Bin capacity at ${marker.capacity}%. Attention needed.`, marker.label);
    } else {
      this.toastService.success(`Status normal. Battery at ${marker.battery}%.`, marker.label);
    }
  }

  openConfirm(): void {
    this.isConfirmOpen.set(true);
  }

  onConfirmAction(): void {
    this.confirmLoading.set(true);
    setTimeout(() => {
      this.confirmLoading.set(false);
      this.isConfirmOpen.set(false);
      this.lastActionMessage.set('Confirmed action successfully executed!');
      this.toastService.success('Confirmed action successfully executed!', 'Action Executed');
    }, 800);
  }

  onCancelConfirm(): void {
    this.isConfirmOpen.set(false);
    this.lastActionMessage.set('Action cancelled.');
    this.toastService.info('Operation cancelled by operator.');
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
