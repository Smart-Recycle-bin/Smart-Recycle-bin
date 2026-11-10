import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pagination } from './pagination';

describe('Pagination', () => {
  let component: Pagination;
  let fixture: ComponentFixture<Pagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagination],
    }).compileComponents();

    fixture = TestBed.createComponent(Pagination);
    component = fixture.componentInstance;
  });

  it('should compute range and totalPages accurately', async () => {
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 8);
    fixture.componentRef.setInput('total', 14);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.startItem()).toBe(1);
    expect(component.endItem()).toBe(8);
    expect(component.totalPages()).toBe(2);
    expect(component.canPrev()).toBe(false);
    expect(component.canNext()).toBe(true);

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Showing 1–8 of 14');
    expect(text).toContain('Page 1 / 2');
  });

  it('should compute last partial page range', async () => {
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('pageSize', 8);
    fixture.componentRef.setInput('total', 14);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.startItem()).toBe(9);
    expect(component.endItem()).toBe(14);
    expect(component.canPrev()).toBe(true);
    expect(component.canNext()).toBe(false);
  });

  it('should handle empty total gracefully', async () => {
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 10);
    fixture.componentRef.setInput('total', 0);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.totalPages()).toBe(1);
    expect(component.canPrev()).toBe(false);
    expect(component.canNext()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Showing 0 of 0');
  });

  it('should emit pageChange on next and prev clicks', async () => {
    const emitted: number[] = [];
    component.pageChange.subscribe((p) => emitted.push(p));

    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 5);
    fixture.componentRef.setInput('total', 12);
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    buttons[1].click(); // Next
    expect(emitted).toEqual([2]);

    fixture.componentRef.setInput('page', 2);
    await fixture.whenStable();
    fixture.detectChanges();
    buttons[0].click(); // Prev
    expect(emitted).toEqual([2, 1]);
  });
});
