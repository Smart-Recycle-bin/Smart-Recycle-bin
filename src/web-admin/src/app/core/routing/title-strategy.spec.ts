import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { AppTitleStrategy } from './title-strategy';

describe('AppTitleStrategy', () => {
  let strategy: AppTitleStrategy;
  let titleService: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppTitleStrategy, Title],
    });
    strategy = TestBed.inject(AppTitleStrategy);
    titleService = TestBed.inject(Title);
  });

  it('updates document title to "EcoBin Admin | <route title>" when data.title exists', () => {
    const mockSnapshot = {
      root: {
        firstChild: {
          data: { title: 'Bins List' },
          firstChild: null,
        } as unknown as ActivatedRouteSnapshot,
      } as unknown as ActivatedRouteSnapshot,
    } as unknown as RouterStateSnapshot;

    strategy.updateTitle(mockSnapshot);
    expect(titleService.getTitle()).toBe('EcoBin Admin | Bins List');
  });

  it('falls back to default "EcoBin Admin" when route title is missing', () => {
    const mockSnapshot = {
      root: {
        firstChild: {
          data: {},
          firstChild: null,
        } as unknown as ActivatedRouteSnapshot,
      } as unknown as ActivatedRouteSnapshot,
    } as unknown as RouterStateSnapshot;

    strategy.updateTitle(mockSnapshot);
    expect(titleService.getTitle()).toBe('EcoBin Admin');
  });
});
