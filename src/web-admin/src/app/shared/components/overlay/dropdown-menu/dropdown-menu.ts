import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon, IconName } from '@shared/components/icon/icon';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: IconName | string;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
}

@Component({
  selector: 'app-dropdown-menu',
  imports: [Icon],
  templateUrl: './dropdown-menu.html',
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownMenu {
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  readonly items = input<DropdownMenuItem[]>([]);
  readonly headerTitle = input<string>('');
  readonly headerSubtitle = input<string>('');
  readonly align = input<'start' | 'end'>('end');
  readonly ariaLabel = input<string>('Menu');

  readonly itemSelected = output<DropdownMenuItem>();
  readonly openedChange = output<boolean>();

  readonly isOpen = signal<boolean>(false);

  readonly triggerWrapper = viewChild<ElementRef<HTMLElement>>('triggerWrap');
  readonly menuPanel = viewChild<ElementRef<HTMLElement>>('menuPanel');

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as Node | null;
    if (target && !this.hostRef.nativeElement.contains(target)) {
      this.close(false);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.isOpen()) return;
    event.preventDefault();
    this.close(true);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close(false);
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen.set(true);
    this.openedChange.emit(true);
    queueMicrotask(() => {
      const firstBtn = this.menuPanel()?.nativeElement.querySelector(
        'button[role="menuitem"]:not(:disabled)'
      ) as HTMLButtonElement | null;
      firstBtn?.focus();
    });
  }

  close(restoreFocus: boolean): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.openedChange.emit(false);
    if (restoreFocus) {
      const triggerEl = this.triggerWrapper()?.nativeElement.querySelector(
        'button, a, [tabindex]'
      ) as HTMLElement | null;
      (triggerEl ?? this.triggerWrapper()?.nativeElement)?.focus();
    }
  }

  selectItem(item: DropdownMenuItem): void {
    if (item.disabled) return;
    this.close(false);
    this.itemSelected.emit(item);
  }

  handleMenuKeyDown(event: KeyboardEvent): void {
    const panel = this.menuPanel()?.nativeElement;
    if (!panel) return;
    const buttons = Array.from(
      panel.querySelectorAll('button[role="menuitem"]:not(:disabled)')
    ) as HTMLButtonElement[];
    if (!buttons.length) return;

    const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      buttons[(currentIdx + 1) % buttons.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      buttons[(currentIdx - 1 + buttons.length) % buttons.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      buttons[buttons.length - 1]?.focus();
    }
  }
}
