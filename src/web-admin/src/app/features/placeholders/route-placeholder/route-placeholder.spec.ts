import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RoutePlaceholder } from './route-placeholder';

describe('RoutePlaceholder', () => {
  let component: RoutePlaceholder;
  let fixture: ComponentFixture<RoutePlaceholder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutePlaceholder],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ title: 'Bins List', description: 'Manage fleet bins' }),
            snapshot: { data: { title: 'Bins List', description: 'Manage fleet bins' } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoutePlaceholder);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and render route title', () => {
    expect(component).toBeTruthy();
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1');
    expect(h1?.textContent).toContain('Bins List');
  });
});
