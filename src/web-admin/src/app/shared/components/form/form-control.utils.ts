import { DestroyRef, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, NgControl, ValidationErrors } from '@angular/forms';

export function formatControlErrors(errors: ValidationErrors | null | undefined): string {
  if (!errors) return '';
  if (errors['serverError']) {
    return typeof errors['serverError'] === 'string' ? errors['serverError'] : 'Invalid value.';
  }
  if (errors['trimmedRequired'] || errors['required']) return 'This field is required.';
  if (errors['email']) return 'Please enter a valid email address.';
  if (errors['maxLen']) {
    const req = errors['maxLen'] as { requiredLength: number };
    return `Must be at most ${req.requiredLength} characters.`;
  }
  if (errors['minlength']) {
    const req = errors['minlength'] as { requiredLength: number };
    return `Must be at least ${req.requiredLength} characters.`;
  }
  if (errors['maxlength']) {
    const req = errors['maxlength'] as { requiredLength: number };
    return `Must be at most ${req.requiredLength} characters.`;
  }
  if (errors['positiveInt']) return 'Must be a whole number greater than 0.';
  if (errors['nonNegativeInt']) return 'Must be a whole number 0 or greater.';
  if (errors['integer']) return 'Must be a whole number.';
  if (errors['latitude']) return 'Latitude must be between -90 and 90.';
  if (errors['longitude']) return 'Longitude must be between -180 and 180.';
  if (errors['phone']) return 'Please enter a valid phone number (7–15 digits).';
  if (errors['strongTempPassword']) {
    return 'Password must be at least 8 characters with at least one letter and one number.';
  }
  if (errors['dateOrder']) return 'End date cannot be earlier than start date.';
  if (errors['min']) {
    const req = errors['min'] as { min: number };
    return `Must be at least ${req.min}.`;
  }
  if (errors['max']) {
    const req = errors['max'] as { max: number };
    return `Must be at most ${req.max}.`;
  }
  if (errors['pattern']) return 'Invalid format.';
  const firstKey = Object.keys(errors)[0];
  const val = errors[firstKey];
  return typeof val === 'string' ? val : 'Invalid value.';
}

export function syncNgControlState(
  ngControl: NgControl | null,
  controlErrorSignal: WritableSignal<string>,
  touchedSignal?: WritableSignal<boolean>,
  dirtySignal?: WritableSignal<boolean>
): void {
  const ctrl: AbstractControl | null | undefined = ngControl?.control;
  if (!ctrl) return;
  touchedSignal?.set(ctrl.touched);
  dirtySignal?.set(ctrl.dirty);
  if (ctrl.invalid && (ctrl.touched || ctrl.dirty)) {
    controlErrorSignal.set(formatControlErrors(ctrl.errors));
  } else {
    controlErrorSignal.set('');
  }
}

export function bindNgControlState(
  ngControl: NgControl | null,
  destroyRef: DestroyRef,
  controlErrorSignal: WritableSignal<string>,
  touchedSignal?: WritableSignal<boolean>,
  dirtySignal?: WritableSignal<boolean>
): void {
  const ctrl = ngControl?.control;
  if (!ctrl) return;
  syncNgControlState(ngControl, controlErrorSignal, touchedSignal, dirtySignal);
  ctrl.events
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe(() => syncNgControlState(ngControl, controlErrorSignal, touchedSignal, dirtySignal));
}
