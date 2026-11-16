import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validates that a string value is not empty or composed solely of whitespace characters.
 */
export function trimmedRequired(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined) {
    return { trimmedRequired: true };
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return { trimmedRequired: true };
  }
  if (Array.isArray(value) && value.length === 0) {
    return { trimmedRequired: true };
  }
  return null;
}

/**
 * Validates that a string value (when trimmed) does not exceed `max` characters.
 */
export function maxLen(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const str = typeof value === 'string' ? value.trim() : String(value);
    if (str.length > max) {
      return { maxLen: { requiredLength: max, actualLength: str.length } };
    }
    return null;
  };
}

/**
 * Validates that a number or numeric string is an integer (no fractional parts).
 */
export function integer(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const num = Number(str);
  if (isNaN(num) || !Number.isInteger(num) || str.includes('.')) {
    return { integer: true };
  }
  return null;
}

/**
 * Validates that a numeric value is a positive integer (> 0).
 */
export function positiveInt(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const num = Number(str);
  if (isNaN(num) || !Number.isInteger(num) || num <= 0 || str.includes('.')) {
    return { positiveInt: true };
  }
  return null;
}

/**
 * Validates that a numeric value is a non-negative integer (>= 0).
 */
export function nonNegativeInt(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const num = Number(str);
  if (isNaN(num) || !Number.isInteger(num) || num < 0 || str.includes('.')) {
    return { nonNegativeInt: true };
  }
  return null;
}

/**
 * Validates that a value is a valid latitude between -90 and 90 degrees inclusive.
 */
export function latitude(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const num = Number(str);
  if (isNaN(num) || num < -90 || num > 90 || str === '') {
    return { latitude: true };
  }
  return null;
}

/**
 * Validates that a value is a valid longitude between -180 and 180 degrees inclusive.
 */
export function longitude(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const num = Number(str);
  if (isNaN(num) || num < -180 || num > 180 || str === '') {
    return { longitude: true };
  }
  return null;
}

/**
 * Permissive E.164-style phone validator (PROPOSED, gap_api.md).
 * Allows optional leading '+', spaces, hyphens, and parentheses, requiring 7 to 15 digits.
 */
export function phone(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).trim();
  const validChars = /^\+?[0-9\s\-().]+$/;
  if (!validChars.test(str)) {
    return { phone: true };
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { phone: true };
  }
  return null;
}

/**
 * Strong temporary password policy (PROPOSED, gap_api.md).
 * Requires minimum 8 characters, at least one letter, at least one digit, and no whitespace.
 */
export function strongTempPassword(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value);
  // Min 8 chars, at least one letter [A-Za-z], at least one digit [0-9], no whitespace
  const STRONG_PWD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[^\s]{8,}$/;
  if (!STRONG_PWD_REGEX.test(str)) {
    return { strongTempPassword: true };
  }
  return null;
}

/**
 * Cross-field validator ensuring fromKey date is not chronologically after toKey date.
 * Sets `{ dateOrder: true }` on toKey control if invalid.
 */
export function dateOrder(fromKey: string, toKey: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const fromControl = group.get(fromKey);
    const toControl = group.get(toKey);

    if (!fromControl || !toControl) {
      return null;
    }

    const fromVal = fromControl.value;
    const toVal = toControl.value;

    if (!fromVal || !toVal) {
      // Clear dateOrder error if either is missing
      if (toControl.errors && toControl.errors['dateOrder']) {
        const { dateOrder: _, ...remainingErrors } = toControl.errors;
        toControl.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
      }
      return null;
    }

    const fromTime = new Date(fromVal).getTime();
    const toTime = new Date(toVal).getTime();

    if (!isNaN(fromTime) && !isNaN(toTime) && fromTime > toTime) {
      const currentErrors = toControl.errors || {};
      toControl.setErrors({ ...currentErrors, dateOrder: true });
      return { dateOrder: true };
    }

    // Valid: clear dateOrder error on toControl if it was previously set
    if (toControl.errors && toControl.errors['dateOrder']) {
      const { dateOrder: _, ...remainingErrors } = toControl.errors;
      toControl.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
    }

    return null;
  };
}

/**
 * Converts form control validation errors into human-friendly error messages.
 */
export function getValidationErrorMessage(
  label: string,
  errors: ValidationErrors | null | undefined
): string {
  if (!errors) {
    return '';
  }

  if (errors['trimmedRequired'] || errors['required']) {
    return `${label} is required`;
  }
  if (errors['maxLen']) {
    return `Must be at most ${errors['maxLen'].requiredLength} characters`;
  }
  if (errors['maxlength']) {
    return `Must be at most ${errors['maxlength'].requiredLength} characters`;
  }
  if (errors['email']) {
    return 'Enter a valid email address';
  }
  if (errors['integer']) {
    return 'Must be a whole number';
  }
  if (errors['positiveInt']) {
    return 'Must be a whole number greater than 0';
  }
  if (errors['nonNegativeInt']) {
    return 'Must be a whole number 0 or greater';
  }
  if (errors['latitude']) {
    return 'Latitude must be between -90 and 90';
  }
  if (errors['longitude']) {
    return 'Longitude must be between -180 and 180';
  }
  if (errors['phone']) {
    return 'Enter a valid phone number (7–15 digits)';
  }
  if (errors['strongTempPassword']) {
    return 'Password must be at least 8 characters with at least one letter and one number';
  }
  if (errors['dateOrder']) {
    return 'End date cannot be earlier than start date';
  }
  if (errors['max']) {
    return `Value cannot exceed ${errors['max'].max}`;
  }
  if (errors['min']) {
    return `Value must be at least ${errors['min'].min}`;
  }
  if (errors['serverError']) {
    return typeof errors['serverError'] === 'string' ? errors['serverError'] : 'Invalid value';
  }

  return 'Invalid value';
}
