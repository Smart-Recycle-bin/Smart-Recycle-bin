import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthLayout } from './auth-layout';

@Component({
  imports: [AuthLayout],
  template: `
    <app-auth-layout title="Welcome back" subtitle="Sign in to continue">
      <div auth-aside class="custom-aside">Custom Aside Content</div>
    </app-auth-layout>
  `,
})
class HostAuthLayoutTest {}

describe('AuthLayout', () => {
  let component: AuthLayout;
  let fixture: ComponentFixture<AuthLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthLayout, HostAuthLayoutTest],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should create with left card, router-outlet, and aside panel', () => {
    expect(component).toBeTruthy();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.auth-card')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
    expect(el.querySelector('.auth-aside-panel')).toBeTruthy();
  });

  it('should support projecting custom [auth-aside] content', async () => {
    const hostFixture = TestBed.createComponent(HostAuthLayoutTest);
    await hostFixture.whenStable();
    hostFixture.detectChanges();
    expect((hostFixture.nativeElement as HTMLElement).querySelector('.custom-aside')?.textContent).toContain(
      'Custom Aside Content'
    );
  });
});
