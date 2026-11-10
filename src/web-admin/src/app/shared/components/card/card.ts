import { Component, input } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly padding = input<CardPadding>('md');
  readonly hoverable = input<boolean>(false);
  readonly bordered = input<boolean>(true);
}
