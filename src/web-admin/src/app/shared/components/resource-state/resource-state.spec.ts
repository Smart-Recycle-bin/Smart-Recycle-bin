import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceState } from './resource-state';
import { By } from '@angular/platform-browser';

@Component({
  imports: [ResourceState],
  template: `
    <app-resource-state
      [loading]="loading()"
      [error]="error()"
      [empty]="empty()"
      [emptyTitle]="'No Records Found'"
      [emptyDescription]="'Try adjusting your search criteria'"
      (retry)="onRetry()"
    >
      <div id="projected-content">Real loaded content</div>
    </app-resource-state>
  `,
})
class TestHostComponent {
  loading = signal<boolean>(false);
  error = signal<unknown>(null);
  empty = signal<boolean>(false);
  retryCount = 0;

  onRetry(): void {
    this.retryCount++;
  }
}

describe('ResourceStateComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, ResourceState],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders projected content when in success state', () => {
    const projected = fixture.debugElement.query(By.css('#projected-content'));
    expect(projected).toBeTruthy();
    expect(projected.nativeElement.textContent).toBe('Real loaded content');

    expect(fixture.debugElement.query(By.css('app-skeleton'))).toBeNull();
    expect(fixture.debugElement.query(By.css('app-error-state'))).toBeNull();
    expect(fixture.debugElement.query(By.css('app-empty-state'))).toBeNull();
  });

  it('renders skeleton when loading is true', () => {
    host.loading.set(true);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-skeleton'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#projected-content'))).toBeNull();
  });

  it('renders error state and technical details when error is set', () => {
    host.error.set(new Error('Connection timed out'));
    fixture.detectChanges();

    const errorEl = fixture.debugElement.query(By.css('app-error-state'));
    expect(errorEl).toBeTruthy();
    expect(errorEl.componentInstance.technicalDetails()).toBe('Connection timed out');
    expect(fixture.debugElement.query(By.css('#projected-content'))).toBeNull();
  });

  it('emits retry when retry is clicked in error state', () => {
    host.error.set('Network failure');
    fixture.detectChanges();

    const errorComponent = fixture.debugElement.query(By.css('app-error-state')).componentInstance;
    errorComponent.handleRetry();

    expect(host.retryCount).toBe(1);
  });

  it('renders empty state when empty is true', () => {
    host.empty.set(true);
    fixture.detectChanges();

    const emptyEl = fixture.debugElement.query(By.css('app-empty-state'));
    expect(emptyEl).toBeTruthy();
    expect(emptyEl.componentInstance.title()).toBe('No Records Found');
    expect(emptyEl.componentInstance.description()).toBe('Try adjusting your search criteria');
    expect(fixture.debugElement.query(By.css('#projected-content'))).toBeNull();
  });
});
