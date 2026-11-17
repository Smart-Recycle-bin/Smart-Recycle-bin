import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MapLoadBudgetService } from './map-load-budget.service';

describe('MapLoadBudgetService', () => {
  let service: MapLoadBudgetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapLoadBudgetService);
    service.resetForTesting();
  });

  afterEach(() => {
    service.resetForTesting();
  });

  it('permits initial Map instantiations and tracks counts', () => {
    expect(service.allow()).toBe(true);
    expect(service.getSessionCount()).toBe(0);
    expect(service.getPageCount()).toBe(0);

    const recorded = service.recordInit();
    expect(recorded).toBe(true);
    expect(service.getSessionCount()).toBe(1);
    expect(service.getPageCount()).toBe(1);
    expect(service.getRemainingBudget()).toBe(7);
  });

  it('enforces hard limit of 8 and disallows further instantiations beyond it', () => {
    for (let i = 0; i < 8; i++) {
      expect(service.allow()).toBe(true);
      expect(service.recordInit()).toBe(true);
    }

    expect(service.getSessionCount()).toBe(8);
    expect(service.allow()).toBe(false);
    expect(service.getRemainingBudget()).toBe(0);

    // 9th instantiation attempt must be denied
    const denied = service.recordInit();
    expect(denied).toBe(false);
    expect(service.getSessionCount()).toBe(8);
  });

  it('persists session count across service recreations via sessionStorage', () => {
    service.recordInit();
    service.recordInit();
    service.recordInit();

    expect(service.getSessionCount()).toBe(3);

    // Create a new instance simulating component re-mount
    const newService = new MapLoadBudgetService();
    expect(newService.getSessionCount()).toBe(3);
    expect(newService.getPageCount()).toBe(0); // page count is fresh
    expect(newService.getRemainingBudget()).toBe(5);
  });

  it('supports custom configurable limits', () => {
    service.setLimit(3);
    service.recordInit();
    service.recordInit();
    expect(service.allow()).toBe(true);

    service.recordInit();
    expect(service.allow()).toBe(false);
  });

  it('exposes __mapInits on window when running in development environment', () => {
    service.recordInit();
    const inits = (window as unknown as { __mapInits?: { session: number; page: number; limit: number } }).__mapInits;

    expect(inits).toBeDefined();
    expect(inits?.session).toBe(1);
    expect(inits?.page).toBe(1);
    expect(inits?.limit).toBe(8);
  });
});
