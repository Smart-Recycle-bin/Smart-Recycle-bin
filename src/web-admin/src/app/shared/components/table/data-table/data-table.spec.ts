import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataTable } from './data-table';

describe('DataTable', () => {
  let component: DataTable;
  let fixture: ComponentFixture<DataTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTable],
    }).compileComponents();

    fixture = TestBed.createComponent(DataTable);
    fixture.componentRef.setInput('columns', [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name' },
    ]);
    fixture.componentRef.setInput('data', [{ id: '1', name: 'Item 1' }]);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
