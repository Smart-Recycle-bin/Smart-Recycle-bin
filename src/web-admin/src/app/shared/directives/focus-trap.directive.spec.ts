import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FocusTrapDirective } from './focus-trap.directive';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Component({
  imports: [FocusTrapDirective],
  template: `
    <button id="opener" (click)="isOpen.set(true)">Open Dialog</button>
    <div id="sibling-app">Other App Content</div>

    @if (isOpen()) {
      <div id="dialog-root" [appFocusTrap]="true" (escapePressed)="isOpen.set(false)">
        <button id="close-btn">Close</button>
        <input id="first-input" type="text" />
        <input id="autofocus-input" type="text" data-autofocus />
        <button id="action-btn">Submit</button>
      </div>
    }
  `,
})
class TestHostComponent {
  readonly isOpen = signal<boolean>(false);
}

describe('FocusTrapDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, FocusTrapDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('moves initial focus to the element marked data-autofocus', async () => {
    const opener = document.getElementById('opener') as HTMLButtonElement;
    opener.focus();
    expect(document.activeElement).toBe(opener);

    component.isOpen.set(true);
    fixture.detectChanges();
    await delay(70);

    const autofocusInput = document.getElementById('autofocus-input');
    expect(document.activeElement).toBe(autofocusInput);
  });

  it('traps Tab navigation in a loop inside the host element', async () => {
    component.isOpen.set(true);
    fixture.detectChanges();
    await delay(70);

    const dialog = document.getElementById('dialog-root') as HTMLElement;
    const actionBtn = document.getElementById('action-btn') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;

    // Focus last element
    actionBtn.focus();
    expect(document.activeElement).toBe(actionBtn);

    // Press Tab from last element -> should loop to first element (closeBtn)
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    dialog.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(closeBtn);

    // Press Shift+Tab from first element -> should loop to last element (actionBtn)
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    dialog.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(actionBtn);
  });

  it('emits escapePressed and closes on Escape key', async () => {
    component.isOpen.set(true);
    fixture.detectChanges();
    await delay(70);

    const dialog = document.getElementById('dialog-root') as HTMLElement;
    expect(dialog).toBeTruthy();

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    dialog.dispatchEvent(escapeEvent);
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('locks body scroll while active and restores it on close', async () => {
    expect(document.body.style.overflow).toBe('');

    component.isOpen.set(true);
    fixture.detectChanges();
    await delay(70);

    expect(document.body.style.overflow).toBe('hidden');

    component.isOpen.set(false);
    fixture.detectChanges();

    expect(document.body.style.overflow).toBe('');
  });

  it('restores focus to the opener element after closing', async () => {
    const opener = document.getElementById('opener') as HTMLButtonElement;
    opener.focus();

    component.isOpen.set(true);
    fixture.detectChanges();
    await delay(70);

    component.isOpen.set(false);
    fixture.detectChanges();

    expect(document.activeElement).toBe(opener);
  });
});
