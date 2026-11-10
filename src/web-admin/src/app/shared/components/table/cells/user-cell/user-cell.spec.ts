import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserCell } from './user-cell';

describe('UserCell', () => {
  let fixture: ComponentFixture<UserCell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCell],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCell);
    fixture.componentRef.setInput('name', 'Laila Hamdy');
    fixture.componentRef.setInput('subtitle', 'U-10021');
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should render name, subtitle, and avatar', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Laila Hamdy');
    expect(el.textContent).toContain('U-10021');
    expect(el.querySelector('app-avatar')).toBeTruthy();
  });
});
