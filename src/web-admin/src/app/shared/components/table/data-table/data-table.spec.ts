import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BadgeVariant } from '@shared/components/badge/badge';
import { CellTemplateDirective } from './cell-template.directive';
import { DataTable, TableAction, TableColumn, TableSort } from './data-table';
import { MonoIdCell } from '../cells/mono-id-cell/mono-id-cell';
import { FillLevelCell } from '../cells/fill-level-cell/fill-level-cell';

interface DemoRow {
  uid: string;
  name: string;
  fill: number;
  status: string;
}

const DEMO_DATA: DemoRow[] = [
  { uid: 'BIN-10', name: 'charlie', fill: 34, status: 'Available' },
  { uid: 'BIN-2', name: 'Alpha', fill: 97, status: '≥95% FULL' },
  { uid: 'BIN-1', name: 'bravo', fill: 85, status: '≥80% FULL' },
  { uid: 'BIN-3', name: 'Delta', fill: 12, status: 'Inactive' },
];

const STATUS_BADGE_MAP: Record<string, BadgeVariant> = {
  Available: 'success',
  '≥80% FULL': 'warning',
  '≥95% FULL': 'danger',
  Inactive: 'neutral',
  'Sent to Retraining': 'purple',
};

@Component({
  imports: [DataTable, CellTemplateDirective, MonoIdCell, FillLevelCell],
  template: `
    <app-data-table
      [columns]="columns"
      [data]="rows()"
      [rowId]="rowIdFn"
      [selectable]="true"
      [rowClickable]="rowClickable()"
      [actions]="actions"
      [pageSize]="2"
      (rowClick)="clickedRows.push($event)"
      (actionClicked)="actionEvents.push($event)"
    >
      <ng-template appCell="uid" let-row>
        <app-mono-id-cell [value]="row.uid" />
      </ng-template>
      <ng-template appCell="fill" let-row>
        <app-fill-level-cell [value]="row.fill" />
      </ng-template>
    </app-data-table>
  `,
})
class HostTemplateTestComponent {
  readonly rows = signal<DemoRow[]>(DEMO_DATA);
  readonly rowClickable = signal<boolean>(true);
  readonly clickedRows: DemoRow[] = [];
  readonly actionEvents: { action: string; row: DemoRow }[] = [];
  readonly rowIdFn = (row: DemoRow) => row.uid;
  readonly actions: TableAction<DemoRow>[] = [
    { id: 'view', icon: 'eye', label: 'View' },
  ];
  readonly columns: TableColumn<DemoRow>[] = [
    { key: 'uid', label: 'Bin ID', sortable: true, nowrap: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'fill', label: 'Fill Level', sortable: true },
    {
      key: 'status',
      label: 'Status',
      type: 'badge',
      badgeVariant: (row) => STATUS_BADGE_MAP[row.status] ?? 'neutral',
    },
  ];
}

describe('DataTable', () => {
  describe('Core behaviors', () => {
    let component: DataTable<DemoRow>;
    let fixture: ComponentFixture<DataTable<DemoRow>>;

    const columns: TableColumn<DemoRow>[] = [
      { key: 'uid', label: 'Bin ID', sortable: true, nowrap: true },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'fill', label: 'Fill', sortable: true, type: 'number' },
      {
        key: 'status',
        label: 'Status',
        type: 'badge',
        badgeVariant: STATUS_BADGE_MAP,
      },
    ];

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [DataTable],
      }).compileComponents();

      fixture = TestBed.createComponent(DataTable<DemoRow>);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('columns', columns);
      fixture.componentRef.setInput('data', DEMO_DATA);
      fixture.componentRef.setInput('rowId', (row: DemoRow) => row.uid);
    });

    it('should create', async () => {
      await fixture.whenStable();
      expect(component).toBeTruthy();
    });

    it('should sort numbers and natural/case-insensitive strings in client mode', async () => {
      fixture.componentRef.setInput('showPagination', false);
      await fixture.whenStable();
      fixture.detectChanges();

      // Numeric natural string sort on uid: BIN-1, BIN-2, BIN-3, BIN-10
      component.handleSort(columns[0]);
      expect(component.sortedData().map((r) => r.uid)).toEqual([
        'BIN-1',
        'BIN-2',
        'BIN-3',
        'BIN-10',
      ]);

      // Case-insensitive sort on name: Alpha, bravo, charlie, Delta
      component.handleSort(columns[1]);
      expect(component.sortedData().map((r) => r.name)).toEqual([
        'Alpha',
        'bravo',
        'charlie',
        'Delta',
      ]);

      // Numeric sort on fill
      component.handleSort(columns[2]);
      expect(component.sortedData().map((r) => r.fill)).toEqual([12, 34, 85, 97]);

      component.handleSort(columns[2]);
      expect(component.sortedData().map((r) => r.fill)).toEqual([97, 85, 34, 12]);

      component.handleSort(columns[2]);
      expect(component.sortedData().map((r) => r.uid)).toEqual([
        'BIN-10',
        'BIN-2',
        'BIN-1',
        'BIN-3',
      ]);
    });

    it('should select right rows when sorted and paginated (page 2+)', async () => {
      const emitted: DemoRow[][] = [];
      component.rowSelected.subscribe((rows) => emitted.push(rows));
      fixture.componentRef.setInput('selectable', true);
      fixture.componentRef.setInput('pageSize', 2);
      await fixture.whenStable();
      fixture.detectChanges();

      // Sort by uid asc -> Page 1: BIN-1, BIN-2; Page 2: BIN-3, BIN-10
      component.handleSort(columns[0]);
      component.handlePageChange(2);
      await fixture.whenStable();
      fixture.detectChanges();

      const page2Rows = component.displayData();
      expect(page2Rows.map((r) => r.uid)).toEqual(['BIN-3', 'BIN-10']);

      // Toggle first row on page 2 (BIN-3)
      component.toggleSelectRow(page2Rows[0]);
      expect(emitted.at(-1)?.map((r) => r.uid)).toEqual(['BIN-3']);

      // Go back to page 1 and select BIN-1 as well
      component.handlePageChange(1);
      const page1Rows = component.displayData();
      component.toggleSelectRow(page1Rows[0]);
      expect(emitted.at(-1)?.map((r) => r.uid)).toEqual(['BIN-3', 'BIN-1']);
    });

    it('should preserve selection across server-mode pages and clear via clearSelection()', async () => {
      const emitted: DemoRow[][] = [];
      component.rowSelected.subscribe((rows) => emitted.push(rows));
      fixture.componentRef.setInput('mode', 'server');
      fixture.componentRef.setInput('selectable', true);
      fixture.componentRef.setInput('pageSize', 2);
      fixture.componentRef.setInput('total', 4);
      fixture.componentRef.setInput('data', DEMO_DATA.slice(0, 2)); // Page 1: BIN-10, BIN-2
      await fixture.whenStable();
      fixture.detectChanges();

      component.toggleSelectRow(DEMO_DATA[0]); // Select BIN-10 on page 1
      expect(emitted.at(-1)?.map((r) => r.uid)).toEqual(['BIN-10']);

      // Server returns Page 2 data: BIN-1, BIN-3 (BIN-10 is no longer in data())
      fixture.componentRef.setInput('page', 2);
      fixture.componentRef.setInput('data', DEMO_DATA.slice(2, 4));
      await fixture.whenStable();
      fixture.detectChanges();

      component.toggleSelectRow(DEMO_DATA[2]); // Select BIN-1 on page 2
      expect(emitted.at(-1)?.map((r) => r.uid)).toEqual(['BIN-10', 'BIN-1']);

      // Clear selection
      component.clearSelection();
      expect(component.selectedIds().size).toBe(0);
      expect(emitted.at(-1)).toEqual([]);
    });

    it('should warn in dev mode when selectable has no rowId and rows lack id', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const freshFixture = TestBed.createComponent(DataTable<{ code: string }>);
      freshFixture.componentRef.setInput('columns', [{ key: 'code', label: 'Code' }]);
      freshFixture.componentRef.setInput('data', [{ code: 'X-1' }]);
      freshFixture.componentRef.setInput('selectable', true);
      await freshFixture.whenStable();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[rowId] must be provided')
      );
      warnSpy.mockRestore();
    });

    it('should warn in dev mode when server mode omits total and not pretend 1 page', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      fixture.componentRef.setInput('mode', 'server');
      fixture.componentRef.setInput('total', null);
      fixture.componentRef.setInput('pageSize', 4);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('mode="server" requires [total]')
      );
      const footerText = (fixture.nativeElement as HTMLElement).querySelector('.table-footer')?.textContent;
      expect(footerText).toContain('Page 1');
      expect(footerText).not.toContain('Page 1 / 1');
      warnSpy.mockRestore();
    });

    it('should keep footer visible while loading with pagination buttons disabled', async () => {
      fixture.componentRef.setInput('loading', true);
      fixture.componentRef.setInput('pageSize', 2);
      await fixture.whenStable();
      fixture.detectChanges();

      const footer = (fixture.nativeElement as HTMLElement).querySelector('.table-footer');
      expect(footer).toBeTruthy();
      const buttons = footer!.querySelectorAll('button');
      expect(buttons[0].disabled).toBe(true);
      expect(buttons[1].disabled).toBe(true);
    });

    it('should reset page to 1 when client data length changes but keep page when length stays equal', async () => {
      fixture.componentRef.setInput('pageSize', 2);
      await fixture.whenStable();
      fixture.detectChanges();

      component.handlePageChange(2);
      expect(component.internalPage()).toBe(2);

      // Same length re-emit -> keeps page 2
      fixture.componentRef.setInput('data', [...DEMO_DATA]);
      await fixture.whenStable();
      expect(component.internalPage()).toBe(2);

      // Filtered (different length) -> resets to page 1
      fixture.componentRef.setInput('data', DEMO_DATA.slice(0, 2));
      await fixture.whenStable();
      expect(component.internalPage()).toBe(1);
    });

    it('should NOT locally sort or paginate in server mode and should emit sortChange and pageChange', async () => {
      const sortEvents: TableSort[] = [];
      const pageEvents: number[] = [];
      component.sortChange.subscribe((e) => sortEvents.push(e));
      component.pageChange.subscribe((p) => pageEvents.push(p));

      fixture.componentRef.setInput('mode', 'server');
      fixture.componentRef.setInput('pageSize', 2);
      fixture.componentRef.setInput('total', 20);
      await fixture.whenStable();
      fixture.detectChanges();

      component.handleSort(columns[1]);
      expect(sortEvents).toEqual([{ key: 'name', dir: 'asc' }]);
      expect(component.displayData().map((r) => r.uid)).toEqual([
        'BIN-10',
        'BIN-2',
        'BIN-1',
        'BIN-3',
      ]);

      component.handlePageChange(3);
      expect(pageEvents).toEqual([3]);
    });

    it('should map badge variants from consumer map without string guessing', async () => {
      fixture.componentRef.setInput('data', [
        { uid: '1', name: 'A', fill: 10, status: 'Inactive' },
        { uid: '2', name: 'B', fill: 85, status: '≥80% FULL' },
        { uid: '3', name: 'C', fill: 50, status: 'Sent to Retraining' },
      ]);
      await fixture.whenStable();
      fixture.detectChanges();

      const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('app-badge .badge-base');
      expect(badges[0].classList.contains('variant-neutral')).toBe(true);
      expect(badges[1].classList.contains('variant-warning')).toBe(true);
      expect(badges[2].classList.contains('variant-purple')).toBe(true);
    });

    it('should show loading skeletons and empty state properly', async () => {
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelectorAll('.tr-loading').length).toBe(4);

      fixture.componentRef.setInput('loading', false);
      fixture.componentRef.setInput('data', []);
      await fixture.whenStable();
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('app-empty-state')).toBeTruthy();
      expect((fixture.nativeElement as HTMLElement).querySelector('.table-footer')).toBeNull();
    });
  });

  describe('Template cells & rowClick accessibility', () => {
    let fixture: ComponentFixture<HostTemplateTestComponent>;
    let host: HostTemplateTestComponent;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HostTemplateTestComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(HostTemplateTestComponent);
      host = fixture.componentInstance;
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('should render custom appCell templates and emit rowClick on click and Enter/Space', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('app-mono-id-cell').length).toBe(2);
      expect(el.querySelectorAll('app-fill-level-cell').length).toBe(2);
      expect(el.textContent).toContain('Showing 1–2 of 4');

      const firstRow = el.querySelector('tbody tr.tr-row') as HTMLTableRowElement;
      expect(firstRow.getAttribute('tabindex')).toBe('0');
      expect(firstRow.getAttribute('role')).toBe('button');

      firstRow.click();
      firstRow.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      firstRow.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(host.clickedRows.length).toBe(3);

      // Clicking action button or checkbox must not emit rowClick
      const actionBtn = firstRow.querySelector('.td-actions button') as HTMLButtonElement;
      actionBtn.click();
      expect(host.actionEvents.length).toBe(1);
      expect(host.clickedRows.length).toBe(3);
    });

    it('should NOT emit rowClick or set role/tabindex when rowClickable is false', async () => {
      host.rowClickable.set(false);
      await fixture.whenStable();
      fixture.detectChanges();

      const firstRow = (fixture.nativeElement as HTMLElement).querySelector(
        'tbody tr.tr-row'
      ) as HTMLTableRowElement;
      expect(firstRow.getAttribute('tabindex')).toBeNull();
      expect(firstRow.getAttribute('role')).toBeNull();

      firstRow.click();
      expect(host.clickedRows.length).toBe(0);
    });
  });
});
