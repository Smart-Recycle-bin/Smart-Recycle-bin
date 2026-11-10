import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MapMarker, MapView } from './map-view';

const SAMPLE_MARKERS: MapMarker[] = [
  {
    id: 'bin-1',
    code: 'BIN-101',
    label: 'Zamalek North Hub',
    lat: 30.0609,
    lng: 31.2197,
    status: 'available',
    fillLevel: 38,
    collector: 'Karim Hassan',
    lastServiced: '2h ago',
  },
  {
    id: 'bin-2',
    code: 'BIN-102',
    label: 'Maadi Degla Plaza',
    lat: 29.9602,
    lng: 31.2569,
    status: 'critical',
    fillLevel: 96,
    collector: 'Omar Adel',
    lastServiced: '14h ago',
  },
];

describe('MapView', () => {
  let component: MapView;
  let fixture: ComponentFixture<MapView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapView],
    }).compileComponents();

    fixture = TestBed.createComponent(MapView);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('markers', SAMPLE_MARKERS);
    await fixture.whenStable();
  });

  it('should create with Leaflet host container and bin count', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(component).toBeTruthy();
    expect(el.querySelector('.ecobin-leaflet-map')).toBeTruthy();
    expect(el.querySelector('.map-device-count')?.textContent?.trim()).toBe('2 bins');
  });

  it('should show floating detail popup on marker selection and emit detailsClicked', async () => {
    const markerSpy = vi.fn();
    const detailsSpy = vi.fn();
    component.markerClicked.subscribe(markerSpy);
    component.detailsClicked.subscribe(detailsSpy);

    component.selectMarker(SAMPLE_MARKERS[1]);
    await fixture.whenStable();

    expect(markerSpy).toHaveBeenCalledWith(SAMPLE_MARKERS[1]);

    const el = fixture.nativeElement as HTMLElement;
    const popup = el.querySelector('.marker-popup-card');
    expect(popup).toBeTruthy();
    expect(popup?.textContent).toContain('BIN-102');
    expect(popup?.textContent).toContain('Maadi Degla Plaza');
    expect(popup?.textContent).toContain('96%');
    expect(popup?.textContent).toContain('Omar Adel');

    const detailsBtn = popup?.querySelector('.popup-footer button') as HTMLButtonElement;
    detailsBtn.click();
    expect(detailsSpy).toHaveBeenCalledWith(SAMPLE_MARKERS[1]);
  });
});
