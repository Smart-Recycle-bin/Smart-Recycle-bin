import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FileUpload } from './file-upload';

@Component({
  imports: [ReactiveFormsModule, FileUpload],
  template: `<app-file-upload [formControl]="ctrl" accept="image/png,image/jpeg" [maxSizeBytes]="1024" />`,
})
class HostFileTest {
  readonly ctrl = new FormControl<File | null>(null, [Validators.required]);
}

describe('FileUpload', () => {
  let fixture: ComponentFixture<HostFileTest>;
  let host: HostFileTest;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostFileTest],
    }).compileComponents();

    fixture = TestBed.createComponent(HostFileTest);
    host = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should accept valid file and update FormControl', async () => {
    const validFile = new File(['hello'], 'reward.png', { type: 'image/png' });
    const uploadComp = fixture.debugElement.children[0].componentInstance as FileUpload;
    uploadComp.handleDrop({
      preventDefault: () => {},
      dataTransfer: { files: [validFile] },
    } as unknown as DragEvent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.ctrl.value).toBe(validFile);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('reward.png');

    uploadComp.clearFile();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.ctrl.value).toBeNull();
  });

  it('should reject oversized files and show error', async () => {
    const bigContent = new Uint8Array(2048);
    const bigFile = new File([bigContent], 'huge.png', { type: 'image/png' });
    const uploadComp = fixture.debugElement.children[0].componentInstance as FileUpload;
    uploadComp.handleDrop({
      preventDefault: () => {},
      dataTransfer: { files: [bigFile] },
    } as unknown as DragEvent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.ctrl.value).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain(
      'exceeds maximum size'
    );
  });
});
