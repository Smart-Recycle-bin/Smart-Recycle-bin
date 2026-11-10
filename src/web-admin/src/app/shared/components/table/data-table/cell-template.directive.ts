import { Directive, TemplateRef, inject, input } from '@angular/core';

export interface CellTemplateContext<T = unknown> {
  $implicit: T;
  row: T;
  column: string;
  index: number;
}

@Directive({
  selector: 'ng-template[appCell]',
})
export class CellTemplateDirective<T = unknown> {
  readonly appCell = input.required<string>();
  readonly templateRef = inject<TemplateRef<CellTemplateContext<T>>>(TemplateRef);
}
