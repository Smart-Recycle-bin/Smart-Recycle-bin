import {
  Directive,
  ElementRef,
  HostListener,
  OnDestroy,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([aria-hidden="true"]), [href], input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"]), select:not([disabled]):not([aria-hidden="true"]), textarea:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"])';

@Directive({
  selector: '[appFocusTrap]',
})
export class FocusTrapDirective implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly appFocusTrap = input<boolean>(true);
  readonly closeOnEscape = input<boolean>(true);
  readonly restoreFocus = input<boolean>(true);

  readonly escapePressed = output<void>();

  private previousActiveElement: HTMLElement | null = null;
  private previousBodyOverflow: string | null = null;
  private inertedElements: HTMLElement[] = [];
  private isActive = false;

  constructor() {
    effect(() => {
      const active = this.appFocusTrap();
      if (active) {
        this.activate();
      } else {
        this.deactivate();
      }
    });
  }

  private activate(): void {
    if (this.isActive || typeof document === 'undefined') return;
    this.isActive = true;

    this.previousActiveElement = document.activeElement as HTMLElement | null;

    // 1. Lock body scroll
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 2. Make outer elements inert
    this.applyInert();

    // 3. Move initial focus
    // Use queueMicrotask/setTimeout to allow child components to render
    setTimeout(() => {
      if (!this.isActive) return;
      const host = this.elementRef.nativeElement as HTMLElement;

      const autofocusEl = host.querySelector(
        '[data-autofocus], [autofocus]'
      ) as HTMLElement | null;
      if (autofocusEl && typeof autofocusEl.focus === 'function') {
        autofocusEl.focus();
        return;
      }

      const focusables = this.getFocusableElements();
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        if (!host.hasAttribute('tabindex')) {
          host.setAttribute('tabindex', '-1');
        }
        host.focus();
      }
    }, 50);
  }

  private deactivate(): void {
    if (!this.isActive || typeof document === 'undefined') return;
    this.isActive = false;

    // 1. Restore body scroll
    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }

    // 2. Remove inert
    this.removeInert();

    // 3. Restore focus to opener
    if (
      this.restoreFocus() &&
      this.previousActiveElement &&
      typeof this.previousActiveElement.focus === 'function' &&
      document.body.contains(this.previousActiveElement)
    ) {
      this.previousActiveElement.focus();
    }
    this.previousActiveElement = null;
  }

  private applyInert(): void {
    if (typeof document === 'undefined') return;
    const host = this.elementRef.nativeElement;

    // Traverse up to find root-level siblings or main content to mark inert
    let current: HTMLElement | null = host;
    while (current && current.parentElement && current.parentElement !== document.body) {
      current = current.parentElement;
    }

    const rootParent = current?.parentElement ?? document.body;
    const children = Array.from(rootParent.children) as HTMLElement[];

    for (const child of children) {
      if (child !== current && !child.contains(host) && !child.hasAttribute('inert')) {
        child.setAttribute('inert', '');
        this.inertedElements.push(child);
      }
    }
  }

  private removeInert(): void {
    for (const el of this.inertedElements) {
      if (document.body.contains(el)) {
        el.removeAttribute('inert');
      }
    }
    this.inertedElements = [];
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    if (event.key === 'Escape' && this.closeOnEscape()) {
      event.preventDefault();
      event.stopPropagation();
      this.escapePressed.emit();
      return;
    }

    if (event.key === 'Tab') {
      const focusables = this.getFocusableElements();
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !this.elementRef.nativeElement.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !this.elementRef.nativeElement.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  private getFocusableElements(): HTMLElement[] {
    const host = this.elementRef.nativeElement as HTMLElement;
    const all = Array.from(host.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
    return all.filter((el) => {
      if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      // In JSDOM / test runners without layout engine:
      if (
        el.offsetParent === null &&
        el.offsetWidth === 0 &&
        el.offsetHeight === 0 &&
        el.getClientRects().length === 0
      ) {
        return (
          el.style.display !== 'none' &&
          el.style.visibility !== 'hidden' &&
          !el.closest('[hidden]')
        );
      }
      return (
        el.offsetParent !== null ||
        el.offsetWidth > 0 ||
        el.offsetHeight > 0 ||
        el.getClientRects().length > 0
      );
    });
  }

  ngOnDestroy(): void {
    this.deactivate();
  }
}
