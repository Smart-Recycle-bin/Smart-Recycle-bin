/**
 * Minimal fake google.maps test stub implementing importLibrary, Map, AdvancedMarkerElement,
 * LatLngBounds, and event hooks for isolated unit and integration testing.
 */

export class FakeLatLng {
  constructor(private readonly _lat: number, private readonly _lng: number) {}
  lat(): number {
    return this._lat;
  }
  lng(): number {
    return this._lng;
  }
}

export class FakeLatLngBounds {
  private readonly points: FakeLatLng[] = [];

  constructor(sw?: FakeLatLng, ne?: FakeLatLng) {
    if (sw) this.points.push(sw);
    if (ne) this.points.push(ne);
  }

  extend(point: FakeLatLng | { lat: number; lng: number }): this {
    const lat = typeof (point as FakeLatLng).lat === 'function' ? (point as FakeLatLng).lat() : (point as { lat: number }).lat;
    const lng = typeof (point as FakeLatLng).lng === 'function' ? (point as FakeLatLng).lng() : (point as { lng: number }).lng;
    this.points.push(new FakeLatLng(lat, lng));
    return this;
  }

  getCenter(): FakeLatLng {
    if (this.points.length === 0) return new FakeLatLng(0, 0);
    const avgLat = this.points.reduce((sum, p) => sum + p.lat(), 0) / this.points.length;
    const avgLng = this.points.reduce((sum, p) => sum + p.lng(), 0) / this.points.length;
    return new FakeLatLng(avgLat, avgLng);
  }

  isEmpty(): boolean {
    return this.points.length === 0;
  }
}

export const FakeColorScheme = {
  DARK: 'DARK',
  LIGHT: 'LIGHT',
  FOLLOW_SYSTEM: 'FOLLOW_SYSTEM',
};

export class FakeMap {
  static instancesCreated = 0;
  private readonly listeners = new Map<string, Set<Function>>();

  center: FakeLatLng = new FakeLatLng(30.0444, 31.2357);
  zoom: number = 12;
  options: Record<string, unknown> = {};

  constructor(public readonly element: HTMLElement, options?: Record<string, unknown>) {
    FakeMap.instancesCreated++;
    if (options) {
      this.options = { ...options };
      if (options['center']) {
        const c = options['center'] as { lat: number; lng: number };
        this.center = new FakeLatLng(c.lat, c.lng);
      }
      if (typeof options['zoom'] === 'number') {
        this.zoom = options['zoom'];
      }
    }
  }

  addListener(eventName: string, handler: Function): { remove: () => void } {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);
    return {
      remove: () => this.listeners.get(eventName)?.delete(handler),
    };
  }

  setCenter(latLng: FakeLatLng | { lat: number; lng: number }): void {
    const lat = typeof (latLng as FakeLatLng).lat === 'function' ? (latLng as FakeLatLng).lat() : (latLng as { lat: number }).lat;
    const lng = typeof (latLng as FakeLatLng).lng === 'function' ? (latLng as FakeLatLng).lng() : (latLng as { lng: number }).lng;
    this.center = new FakeLatLng(lat, lng);
  }

  panTo(latLng: FakeLatLng | { lat: number; lng: number }): void {
    this.setCenter(latLng);
  }

  getCenter(): FakeLatLng {
    return this.center;
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  getZoom(): number {
    return this.zoom;
  }

  fitBounds(bounds: FakeLatLngBounds): void {
    this.center = bounds.getCenter();
  }

  setOptions(newOpts: Record<string, unknown>): void {
    this.options = { ...this.options, ...newOpts };
  }

  trigger(eventName: string, ...args: unknown[]): void {
    this.listeners.get(eventName)?.forEach((handler) => handler(...args));
  }
}

export class FakeAdvancedMarkerElement {
  static instancesCreated = 0;
  static instances: FakeAdvancedMarkerElement[] = [];
  private readonly listeners = new Map<string, Set<Function>>();

  map: unknown = null;
  position: unknown = null;
  content: HTMLElement | null = null;
  title: string = '';

  constructor(options?: Record<string, unknown>) {
    FakeAdvancedMarkerElement.instancesCreated++;
    FakeAdvancedMarkerElement.instances.push(this);
    if (options) {
      this.map = options['map'] ?? null;
      this.position = options['position'] ?? null;
      this.content = (options['content'] as HTMLElement) ?? null;
      this.title = (options['title'] as string) ?? '';
    }
  }

  addListener(eventName: string, handler: Function): { remove: () => void } {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(handler);
    return {
      remove: () => this.listeners.get(eventName)?.delete(handler),
    };
  }

  trigger(eventName: string, ...args: unknown[]): void {
    this.listeners.get(eventName)?.forEach((handler) => handler(...args));
  }
}

export const FakeEvent = {
  addListener(instance: { addListener?: Function }, eventName: string, handler: Function) {
    if (instance && typeof instance.addListener === 'function') {
      return instance.addListener(eventName, handler);
    }
    return { remove: () => {} };
  },
  removeListener(listenerHandle: { remove?: () => void }) {
    if (listenerHandle && typeof listenerHandle.remove === 'function') {
      listenerHandle.remove();
    }
  },
  trigger(instance: { trigger?: Function }, eventName: string, ...args: unknown[]) {
    if (instance && typeof instance.trigger === 'function') {
      instance.trigger(eventName, ...args);
    }
  },
};

export function createFakeGoogleMapsStub() {
  return {
    maps: {
      importLibrary: async (libraryName: string) => {
        switch (libraryName) {
          case 'maps':
            return {
              Map: FakeMap,
              ColorScheme: FakeColorScheme,
            };
          case 'marker':
            return {
              AdvancedMarkerElement: FakeAdvancedMarkerElement,
            };
          case 'core':
            return {
              LatLng: FakeLatLng,
              LatLngBounds: FakeLatLngBounds,
              event: FakeEvent,
            };
          default:
            return {};
        }
      },
      Map: FakeMap,
      ColorScheme: FakeColorScheme,
      LatLng: FakeLatLng,
      LatLngBounds: FakeLatLngBounds,
      event: FakeEvent,
      marker: {
        AdvancedMarkerElement: FakeAdvancedMarkerElement,
      },
    },
  };
}

export function installFakeGoogleMaps(): () => void {
  const globalObj = (typeof window !== 'undefined' ? window : (globalThis as unknown as Window)) as unknown as { google?: unknown };
  const previousGoogle = globalObj.google;
  globalObj.google = createFakeGoogleMapsStub();

  return () => {
    if (previousGoogle !== undefined) {
      globalObj.google = previousGoogle;
    } else {
      delete globalObj.google;
    }
  };
}

export function resetFakeGoogleMapsCounters(): void {
  FakeMap.instancesCreated = 0;
  FakeAdvancedMarkerElement.instancesCreated = 0;
  FakeAdvancedMarkerElement.instances = [];
}
