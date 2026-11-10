import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Icon } from './icon';

describe('Icon', () => {
  let component: Icon;
  let fixture: ComponentFixture<Icon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Icon],
    }).compileComponents();

    fixture = TestBed.createComponent(Icon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create and render Lucide SVG icon nodes for design names', async () => {
    fixture.componentRef.setInput('name', 'gift');
    fixture.componentRef.setInput('size', 'lg');
    await fixture.whenStable();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(component).toBeTruthy();
    expect(component.isKnownName()).toBe(true);
    expect(svg).toBeTruthy();
    expect(svg?.style.width).toBe('24px');
    expect(svg?.querySelectorAll('path, rect, circle, polyline, line').length).toBeGreaterThan(0);
  });

  it('should gracefully fall back to info icon on unknown icon names', async () => {
    fixture.componentRef.setInput('name', 'non-existent-icon');
    await fixture.whenStable();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg).toBeTruthy();
    expect(component.isKnownName()).toBe(false);
    expect(svg?.querySelectorAll('circle, path, line').length).toBeGreaterThan(0);
  });
});
