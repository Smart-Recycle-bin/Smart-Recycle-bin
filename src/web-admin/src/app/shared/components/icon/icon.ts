import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Ban,
  Battery,
  Bell,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Clock,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Funnel,
  Gift,
  type IconNode,
  Info,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Map as MapIcon,
  MapPin,
  Menu,
  Moon,
  Pencil,
  Plus,
  QrCode,
  Recycle,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  SquarePen,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Truck,
  Upload,
  User,
  Users,
  Wallet,
  Wifi,
  X,
} from 'lucide';

export type IconName =
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
  | 'pencil'
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
  | 'map-pin'
  | 'recycle'
  | 'truck'
  | 'battery'
  | 'wifi'
  | 'sun'
  | 'moon'
  | 'refresh'
  | 'lock'
  | 'mail'
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
  | 'external-link'
  | 'gift'
  | 'trophy'
  | 'wallet'
  | 'clipboard-check'
  | 'file-text'
  | 'archive'
  | 'ban'
  | 'camera'
  | 'qr-code';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

const LUCIDE_ICONS: Record<IconName, IconNode> = {
  dashboard: LayoutDashboard,
  users: Users,
  user: User,
  settings: Settings,
  search: Search,
  bell: Bell,
  menu: Menu,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  plus: Plus,
  edit: SquarePen,
  pencil: Pencil,
  trash: Trash2,
  eye: Eye,
  'eye-off': EyeOff,
  filter: Funnel,
  download: Download,
  upload: Upload,
  check: Check,
  x: X,
  alert: TriangleAlert,
  info: Info,
  chart: ChartColumn,
  map: MapIcon,
  'map-pin': MapPin,
  recycle: Recycle,
  truck: Truck,
  battery: Battery,
  wifi: Wifi,
  sun: Sun,
  moon: Moon,
  refresh: RefreshCw,
  lock: Lock,
  mail: Mail,
  'log-out': LogOut,
  shield: Shield,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  calendar: Calendar,
  clock: Clock,
  'check-circle': CircleCheck,
  'alert-circle': CircleAlert,
  'x-circle': CircleX,
  layers: Layers,
  activity: Activity,
  cpu: Cpu,
  sparkles: Sparkles,
  'external-link': ExternalLink,
  gift: Gift,
  trophy: Trophy,
  wallet: Wallet,
  'clipboard-check': ClipboardCheck,
  'file-text': FileText,
  archive: Archive,
  ban: Ban,
  camera: Camera,
  'qr-code': QrCode,
};

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  readonly isKnownName = computed<boolean>(() => {
    return Object.prototype.hasOwnProperty.call(LUCIDE_ICONS, this.name());
  });

  readonly nodes = computed<IconNode>(() => {
    const key = this.name() as IconName;
    return LUCIDE_ICONS[key] ?? Info;
  });
}
