import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '@shared/components/icon/icon';
import { FormField } from '../form-field/form-field';
import { bindNgControlState, syncNgControlState } from '../form-control.utils';

@Component({
  selector: 'app-file-upload',
  imports: [Icon, FormField],
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUpload implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('Image');
  readonly accept = input<string>('image/png,image/jpeg');
  readonly maxSizeBytes = input<number>(5 * 1024 * 1024);
  readonly actionText = input<string>('Upload image');
  readonly hint = input<string>('PNG or JPG, min 800×600');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`file-${Math.random().toString(36).substring(2, 9)}`);

  readonly fileSelected = output<File | null>();

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly validationError = signal<string>('');
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  private onChange: (val: File | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(
    () => this.error() || this.validationError() || this.controlError()
  );

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    this.destroyRef.onDestroy(() => this.revokePreview());
  }

  ngOnInit(): void {
    if (this.ngControl) {
      bindNgControlState(
        this.ngControl,
        this.destroyRef,
        this.controlError,
        this.touched,
        this.dirty
      );
    }
  }

  writeValue(file: File | null): void {
    this.setFileState(file, false);
  }

  registerOnChange(fn: (val: File | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  triggerBrowse(): void {
    if (this.internalDisabled()) return;
    this.fileInput()?.nativeElement.click();
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.triggerBrowse();
    }
  }

  handleFileChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0] ?? null;
    if (file) {
      this.processFile(file);
    }
  }

  handleDragOver(event: DragEvent): void {
    if (this.internalDisabled()) return;
    event.preventDefault();
    this.isDragging.set(true);
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  handleDrop(event: DragEvent): void {
    if (this.internalDisabled()) return;
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) {
      this.processFile(file);
    }
  }

  clearFile(event?: Event): void {
    event?.stopPropagation();
    if (this.internalDisabled()) return;
    const el = this.fileInput()?.nativeElement;
    if (el) el.value = '';
    this.validationError.set('');
    this.setFileState(null, true);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private processFile(file: File): void {
    this.touched.set(true);
    this.onTouched();

    const maxBytes = this.maxSizeBytes();
    if (maxBytes > 0 && file.size > maxBytes) {
      this.validationError.set(
        `File exceeds maximum size of ${this.formatFileSize(maxBytes)}.`
      );
      return;
    }

    const acceptedTypes = this.accept()
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (acceptedTypes.length > 0 && !this.matchesAccept(file, acceptedTypes)) {
      this.validationError.set('Unsupported file type.');
      return;
    }

    this.validationError.set('');
    this.setFileState(file, true);
  }

  private matchesAccept(file: File, accepted: string[]): boolean {
    const mime = (file.type || '').toLowerCase();
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    return accepted.some((rule) => {
      if (rule === '*/*') return true;
      if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
      if (rule.startsWith('.')) return ext === rule;
      return mime === rule;
    });
  }

  private setFileState(file: File | null, emit: boolean): void {
    this.revokePreview();
    this.selectedFile.set(file);

    if (file && file.type.startsWith('image/') && typeof URL !== 'undefined' && URL.createObjectURL) {
      this.previewUrl.set(URL.createObjectURL(file));
    }

    if (emit) {
      this.dirty.set(true);
      this.onChange(file);
      this.fileSelected.emit(file);
      syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
    }
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url && typeof URL !== 'undefined' && URL.revokeObjectURL) {
      URL.revokeObjectURL(url);
    }
    this.previewUrl.set(null);
  }
}
