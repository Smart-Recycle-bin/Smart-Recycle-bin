import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { getErrorMessage, isApiErrorCode } from './error-message';
import { ApiError } from './api-error';
import { ApiErrorCode } from '../models/common/api-error-code.enum';

describe('error-message utilities', () => {
  describe('getErrorMessage', () => {
    it('returns string input directly', () => {
      expect(getErrorMessage('Custom error text')).toBe('Custom error text');
    });

    it('returns ApiError message', () => {
      const apiErr = new ApiError({
        status: 400,
        code: ApiErrorCode.ValidationError,
        message: 'Invalid serial number',
        requestUrl: '/api/v1/admin/bins',
      });
      expect(getErrorMessage(apiErr)).toBe('Invalid serial number');
    });

    it('returns nested HttpErrorResponse message', () => {
      const httpErr = new HttpErrorResponse({
        status: 400,
        error: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
          },
        },
      });
      expect(getErrorMessage(httpErr)).toBe('Email is required');
    });

    it('returns direct HttpErrorResponse body message', () => {
      const httpErr = new HttpErrorResponse({
        status: 404,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource was not found',
        },
      });
      expect(getErrorMessage(httpErr)).toBe('Resource was not found');
    });

    it('returns standard JavaScript Error message', () => {
      const err = new Error('Standard failure');
      expect(getErrorMessage(err)).toBe('Standard failure');
    });

    it('returns fallback for null, undefined, or unknown objects', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred. Please try again.');
      expect(getErrorMessage(undefined, 'Custom fallback')).toBe('Custom fallback');
      expect(getErrorMessage({}, 'Custom fallback')).toBe('Custom fallback');
    });
  });

  describe('isApiErrorCode', () => {
    it('identifies code on ApiError', () => {
      const apiErr = new ApiError({
        status: 400,
        code: ApiErrorCode.InvalidCredentials,
        message: 'Bad pass',
        requestUrl: '/auth/login',
      });
      expect(isApiErrorCode(apiErr, ApiErrorCode.InvalidCredentials)).toBe(true);
      expect(isApiErrorCode(apiErr, ApiErrorCode.ValidationError)).toBe(false);
    });

    it('identifies nested code on HttpErrorResponse', () => {
      const httpErr = new HttpErrorResponse({
        status: 400,
        error: {
          error: {
            code: 'DEVICE_ALREADY_REGISTERED',
            message: 'Duplicate serial',
          },
        },
      });
      expect(isApiErrorCode(httpErr, ApiErrorCode.DeviceAlreadyRegistered)).toBe(true);
      expect(isApiErrorCode(httpErr, ApiErrorCode.Conflict)).toBe(false);
    });

    it('identifies direct code on HttpErrorResponse', () => {
      const httpErr = new HttpErrorResponse({
        status: 403,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Suspended account',
        },
      });
      expect(isApiErrorCode(httpErr, ApiErrorCode.AccountSuspended)).toBe(true);
    });

    it('returns false for non-matching or null errors', () => {
      expect(isApiErrorCode(null, ApiErrorCode.ValidationError)).toBe(false);
      expect(isApiErrorCode(new Error('plain error'), ApiErrorCode.ValidationError)).toBe(false);
    });
  });
});
