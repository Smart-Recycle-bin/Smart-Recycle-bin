import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarList } from './bar-list';

describe('BarList', () => {
  let component: BarList;
  let fixture: ComponentFixture<BarList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarList],
    }).compileComponents();

    fixture = TestBed.createComponent(BarList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should resolve item tone, threshold colors, and render bars cleanly', async () => {
    fixture.componentRef.setInput('items', [
      { label: 'Maadi', value: 42 },
      { label: 'Zamalek', value: 84 },
      { label: 'Nasr City', value: 96 },
    ]);
    fixture.componentRef.setInput('thresholds', { warning: 80, danger: 95 });
    await fixture.whenStable();

    const processed = component.processedItems();
    expect(processed[0].barColor).toBe('var(--brand)');
    expect(processed[1].barColor).toBe('var(--warning)');
    expect(processed[2].barColor).toBe('var(--danger)');

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll('.bar-fill');
    expect(bars.length).toBe(3);
  });
});
