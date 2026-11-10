import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BadgeVariant } from '../../badge/badge';
import { CellTemplateDirective } from './cell-template.directive';
import { DataTable, TableColumn, TableSort } from './data-table';
import { MonoIdCell } from '../cells/mono-id-cell/mono-id-cell';
import { FillLevelCell } from '../cells/fill-level-cell/fill-level-cell';

interface DemoRow {
  uid: string;
  name: string;
  fill: number;
  status: string;
}

const DEMO_DATA: DemoRow[] = [
  { uid: 'BIN-0003', name: 'Charlie', fill: 34, status: 'Available' },
  { uid: 'BIN-0001', name: 'Alpha', fill: 97, status: '≥95% FULL' },
  { uid: 'BIN-0002', name: 'Bravo', fill: 85, status: '≥80% FULL' },
  { uid: 'BIN-0004', name: 'Delta', fill: 12, status: 'Inactive' },
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
      [pageSize]="2"
      (rowClick)="clickedRows.push($event)"
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
  readonly clickedRows: DemoRow[] = [];
  readonly rowIdFn = (row: DemoRow) => row.uid;
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

    it('should sort rows in client mode (asc, desc, null)', async () => {
      fixture.componentRef.setInput('showPagination', false);
      await fixture.whenStable();
      fixture.detectChanges();

      const fillCol = columns[2];
      component.handleSort(fillCol);
      expect(component.sortedData().map((r) => r.fill)).toEqual([12, 34, 85, 97]);

      component.handleSort(fillCol);
      expect(component.sortedData().map((r) => r.fill)).toEqual([97, 85, 34, 12]);

      component.handleSort(fillCol);
      expect(component.sortedData().map((r) => r.uid)).toEqual([
        'BIN-0003',
        'BIN-0001',
        'BIN-0002',
        'BIN-0004',
      ]);
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
      // Order stays untouched in server mode
      expect(component.displayData().map((r) => r.uid)).toEqual([
        'BIN-0003',
        'BIN-0001',
        'BIN-0002',
        'BIN-0004',
      ]);

      component.handlePageChange(3);
      expect(pageEvents).toEqual([3]);
    });

    it('should slice rows per page in client mode', async () => {
      fixture.componentRef.setInput('pageSize', 2);
      fixture.componentRef.setInput('page', 1);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.displayData().map((r) => r.uid)).toEqual(['BIN-0003', 'BIN-0001']);

      component.handlePageChange(2);
      expect(component.displayData().map((r) => r.uid)).toEqual(['BIN-0002', 'BIN-0004']);
    });

    it('should track selection using rowId instead of array index', async () => {
      const emitted: DemoRow[][] = [];
      component.rowSelected.subscribe((rows) => emitted.push(rows));
      fixture.componentRef.setInput('selectable', true);
      fixture.componentRef.setInput('showPagination', false);
      await fixture.whenStable();
      fixture.detectChanges();

      component.toggleSelectRow(DEMO_DATA[1], 1); // BIN-0001
      expect(component.selectedIds().has('BIN-0001')).toBe(true);
      expect(emitted.at(-1)?.map((r) => r.uid)).toEqual(['BIN-0001']);

      // Reorder rows via client sort: BIN-0001 moves index, remains selected by uid
      component.handleSort(columns[0]);
      const newIndex = component.displayData().findIndex((r) => r.uid === 'BIN-0001');
      expect(component.isRowSelected(component.displayData()[newIndex], newIndex)).toBe(true);
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
    });
  });

  describe('Template cells & rowClick', () => {
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

    it('should render custom appCell templates and emit rowClick', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('app-mono-id-cell').length).toBe(2);
      expect(el.querySelectorAll('app-fill-level-cell').length).toBe(2);
      expect(el.textContent).toContain('Showing 1–2 of 4');

      const firstRow = el.querySelector('tbody tr.tr-row') as HTMLTableRowElement;
      firstRow.click();
      expect(host.clickedRows.length).toBe(1);
      expect(host.clickedRows[0].uid).toBe('BIN-0003');
    });
  });
});
