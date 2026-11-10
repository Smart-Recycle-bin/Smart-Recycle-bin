import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-tabs',
  imports: [],
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs {
  readonly tabs = input.required<TabItem[]>();
  readonly activeId = input<string | undefined>(undefined);
  readonly ariaLabel = input<string>('Tabs');

  readonly activeChange = output<string>();

  readonly currentId = linkedSignal(() => {
    const id = this.activeId();
    if (id !== undefined) return id;
    return this.tabs()[0]?.id ?? '';
  });

  select(tab: TabItem): void {
    if (tab.disabled) return;
    this.currentId.set(tab.id);
    this.activeChange.emit(tab.id);
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    const list = this.tabs();
    if (!list.length) return;

    let nextIndex = -1;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % list.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + list.length) % list.length;
    }

    if (nextIndex >= 0) {
      event.preventDefault();
      const target = list[nextIndex];
      if (!target.disabled) {
        this.select(target);
        const btns = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
        (btns?.[nextIndex] as HTMLButtonElement | undefined)?.focus();
      }
    }
  }
}
