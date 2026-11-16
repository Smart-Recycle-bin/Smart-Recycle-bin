import { describe, it, expect } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import {
  trimmedRequired,
  maxLen,
  integer,
  positiveInt,
  nonNegativeInt,
  latitude,
  longitude,
  phone,
  strongTempPassword,
  dateOrder,
  getValidationErrorMessage,
} from './app-validators';

describe('App Validators', () => {
  describe('trimmedRequired', () => {
    it.each([
      ['empty string', '', true],
      ['whitespace string', '   ', true],
      ['tabs and newlines', '\t \n ', true],
      ['null', null, true],
      ['undefined', undefined, true],
      ['empty array', [], true],
      ['valid text', 'hello', false],
      ['text with whitespace', '  hello  ', false],
      ['number 0', 0, false],
      ['boolean false', false, false],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [trimmedRequired]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ trimmedRequired: true });
      }
    });
  });

  describe('maxLen', () => {
    const validator = maxLen(5);

    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['3 chars', 'abc', false],
      ['5 chars', 'abcde', false],
      ['5 chars with outer whitespace (trimmed)', '  abcde  ', false],
      ['6 chars', 'abcdef', true],
      ['7 chars with whitespace', '  abcdefg  ', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [validator]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toHaveProperty('maxLen');
      }
    });
  });

  describe('integer', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['integer 0', 0, false],
      ['integer 42', 42, false],
      ['negative integer', -15, false],
      ['integer string', '100', false],
      ['float 3.14', 3.14, true],
      ['float string 3.14', '3.14', true],
      ['string with dot 100.', '100.', true],
      ['non-numeric string', 'abc', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [integer]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ integer: true });
      }
    });
  });

  describe('positiveInt', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['1', 1, false],
      ['100', 100, false],
      ['string "50"', '50', false],
      ['0', 0, true],
      ['string "0"', '0', true],
      ['-5', -5, true],
      ['1.5', 1.5, true],
      ['"1.5"', '1.5', true],
      ['"abc"', 'abc', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [positiveInt]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ positiveInt: true });
      }
    });
  });

  describe('nonNegativeInt', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['0', 0, false],
      ['string "0"', '0', false],
      ['10', 10, false],
      ['-1', -1, true],
      ['string "-10"', '-10', true],
      ['2.4', 2.4, true],
      ['"2.4"', '2.4', true],
      ['"abc"', 'abc', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [nonNegativeInt]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ nonNegativeInt: true });
      }
    });
  });

  describe('latitude', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['0', 0, false],
      ['30.0444', 30.0444, false],
      ['90', 90, false],
      ['-90', -90, false],
      ['string "31.2"', '31.2', false],
      ['90.001', 90.001, true],
      ['-90.001', -90.001, true],
      ['999', 999, true],
      ['-500', -500, true],
      ['"invalid"', 'invalid', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [latitude]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ latitude: true });
      }
    });
  });

  describe('longitude', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['0', 0, false],
      ['31.2357', 31.2357, false],
      ['180', 180, false],
      ['-180', -180, false],
      ['string "-45.5"', '-45.5', false],
      ['180.001', 180.001, true],
      ['-180.001', -180.001, true],
      ['999', 999, true],
      ['-500', -500, true],
      ['"invalid"', 'invalid', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [longitude]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ longitude: true });
      }
    });
  });

  describe('phone', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['+201012345678', '+201012345678', false],
      ['01012345678', '01012345678', false],
      ['7 digits: 1234567', '1234567', false],
      ['15 digits: +123456789012345', '+123456789012345', false],
      ['contains spaces: +20 101 234 5678', '+20 101 234 5678', false],
      ['contains dashes: 010-1234-5678', '010-1234-5678', false],
      ['too short "12345"', '12345', true],
      ['too long (16 digits)', '1234567890123456', true],
      ['contains letters', '+20101234abc', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [phone]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ phone: true });
      }
    });
  });

  describe('strongTempPassword', () => {
    it.each([
      ['null', null, false],
      ['empty', '', false],
      ['Valid: Password123', 'Password123', false],
      ['Valid: tempPass1', 'tempPass1', false],
      ['Too short: Abc1', 'Abc1', true],
      ['Too short: abcdef7', 'abcdef7', true],
      ['No digit: abcdefgh', 'abcdefgh', true],
      ['No letter: 12345678', '12345678', true],
      ['Contains spaces: Pass word1', 'Pass word1', true],
    ])('evaluates %s as invalid: %s', (_, value, shouldBeInvalid) => {
      const control = new FormControl(value, [strongTempPassword]);
      expect(control.invalid).toBe(shouldBeInvalid);
      if (shouldBeInvalid) {
        expect(control.errors).toEqual({ strongTempPassword: true });
      }
    });
  });

  describe('dateOrder', () => {
    it('sets dateOrder error on toKey when from > to', () => {
      const group = new FormGroup(
        {
          start: new FormControl('2025-07-01'),
          end: new FormControl('2025-06-01'),
        },
        [dateOrder('start', 'end')]
      );

      expect(group.invalid).toBe(true);
      expect(group.errors).toEqual({ dateOrder: true });
      expect(group.get('end')?.errors).toEqual({ dateOrder: true });
    });

    it('clears dateOrder error when dates become valid', () => {
      const group = new FormGroup(
        {
          start: new FormControl('2025-07-01'),
          end: new FormControl('2025-06-01'),
        },
        [dateOrder('start', 'end')]
      );

      expect(group.invalid).toBe(true);

      group.get('end')?.setValue('2025-08-01');
      group.updateValueAndValidity();

      expect(group.valid).toBe(true);
      expect(group.get('end')?.errors).toBeNull();
    });

    it('is valid when both dates are identical', () => {
      const group = new FormGroup(
        {
          start: new FormControl('2025-07-01'),
          end: new FormControl('2025-07-01'),
        },
        [dateOrder('start', 'end')]
      );

      expect(group.valid).toBe(true);
    });
  });

  describe('getValidationErrorMessage', () => {
    it('returns appropriate message for each error code', () => {
      expect(getValidationErrorMessage('Serial', { trimmedRequired: true })).toBe('Serial is required');
      expect(getValidationErrorMessage('Title', { maxLen: { requiredLength: 100 } })).toBe(
        'Must be at most 100 characters'
      );
      expect(getValidationErrorMessage('Email', { email: true })).toBe('Enter a valid email address');
      expect(getValidationErrorMessage('Points', { positiveInt: true })).toBe(
        'Must be a whole number greater than 0'
      );
      expect(getValidationErrorMessage('Stock', { nonNegativeInt: true })).toBe(
        'Must be a whole number 0 or greater'
      );
      expect(getValidationErrorMessage('Latitude', { latitude: true })).toBe(
        'Latitude must be between -90 and 90'
      );
      expect(getValidationErrorMessage('Longitude', { longitude: true })).toBe(
        'Longitude must be between -180 and 180'
      );
      expect(getValidationErrorMessage('Phone', { phone: true })).toBe(
        'Enter a valid phone number (7–15 digits)'
      );
      expect(getValidationErrorMessage('Password', { strongTempPassword: true })).toBe(
        'Password must be at least 8 characters with at least one letter and one number'
      );
      expect(getValidationErrorMessage('End date', { dateOrder: true })).toBe(
        'End date cannot be earlier than start date'
      );
      expect(getValidationErrorMessage('Custom', { serverError: 'Backend validation message' })).toBe(
        'Backend validation message'
      );
    });
  });
});
