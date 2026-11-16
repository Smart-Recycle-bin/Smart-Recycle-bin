import {
  DOCUMENT,
  DestroyRef,
  Directive,
  ElementRef,
  HostListener,
  Renderer2,
  inject,
  input,
} from '@angular/core';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

@Directive({
  selector: '[appTooltip]',
})
export class TooltipDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly destroyRef = inject(DestroyRef);

  readonly appTooltip = input<string>('');
  readonly tooltipPosition = input<TooltipPosition>('top');

  private tooltipEl: HTMLElement | null = null;
  private readonly tooltipId = `tooltip-${Math.random().toString(36).substring(2, 9)}`;

  constructor() {
    this.destroyRef.onDestroy(() => this.hide());
  }

  @HostListener('mouseenter')
  @HostListener('focusin')
  show(): void {
    const text = this.appTooltip().trim();
    if (!text || this.tooltipEl) return;

    const el = this.renderer.createElement('div') as HTMLElement;
    this.renderer.setAttribute(el, 'id', this.tooltipId);
    this.renderer.setAttribute(el, 'role', 'tooltip');
    this.renderer.addClass(el, 'app-tooltip');
    this.renderer.addClass(el, `pos-${this.tooltipPosition()}`);
    this.renderer.appendChild(el, this.renderer.createText(text));
    this.renderer.appendChild(this.document.body, el);

    this.tooltipEl = el;
    this.renderer.setAttribute(this.host.nativeElement, 'aria-describedby', this.tooltipId);
    this.positionTooltip(el);
  }

  @HostListener('mouseleave')
  @HostListener('focusout')
  @HostListener('blur')
  @HostListener('click')
  @HostListener('keydown.escape')
  hide(): void {
    if (!this.tooltipEl) return;
    this.renderer.removeChild(this.document.body, this.tooltipEl);
    this.renderer.removeAttribute(this.host.nativeElement, 'aria-describedby');
    this.tooltipEl = null;
  }

  private positionTooltip(el: HTMLElement): void {
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const tipRect = el.getBoundingClientRect();
    const gap = 8;

    let top = hostRect.top - tipRect.height - gap;
    let left = hostRect.left + (hostRect.width - tipRect.width) / 2;

    switch (this.tooltipPosition()) {
      case 'bottom':
        top = hostRect.bottom + gap;
        break;
      case 'left':
        top = hostRect.top + (hostRect.height - tipRect.height) / 2;
        left = hostRect.left - tipRect.width - gap;
        break;
      case 'right':
        top = hostRect.top + (hostRect.height - tipRect.height) / 2;
        left = hostRect.right + gap;
        break;
      case 'top':
      default:
        break;
    }

    const clampedLeft = Math.max(8, Math.min(left, (this.document.defaultView?.innerWidth || 1024) - tipRect.width - 8));
    const clampedTop = Math.max(8, top);

    this.renderer.setStyle(el, 'top', `${clampedTop}px`);
    this.renderer.setStyle(el, 'left', `${clampedLeft}px`);
  }
}
