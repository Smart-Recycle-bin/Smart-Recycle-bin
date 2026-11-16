import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './datetime';

describe('datetime utils', () => {
  describe('formatDateTime', () => {
    it('returns "—" for null, undefined, empty string, or invalid input', () => {
      expect(formatDateTime(null)).toBe('—');
      expect(formatDateTime(undefined)).toBe('—');
      expect(formatDateTime('')).toBe('—');
      expect(formatDateTime('invalid-date')).toBe('—');
      expect(formatDateTime(new Date('invalid'))).toBe('—');
    });

    it('formats summer date in Africa/Cairo (UTC+3) correctly', () => {
      // 2025-06-14 06:42 UTC -> 09:42 in Cairo
      const result = formatDateTime('2025-06-14T06:42:00.000Z');
      expect(result).toBe('2025-06-14 09:42');
    });

    it('formats winter date in Africa/Cairo (UTC+2) correctly', () => {
      // 2025-01-15 10:00 UTC -> 12:00 in Cairo
      const result = formatDateTime('2025-01-15T10:00:00.000Z');
      expect(result).toBe('2025-01-15 12:00');
    });

    it('handles UTC midnight rollover across the date boundary', () => {
      // 2025-06-14 22:30 UTC -> 2025-06-15 01:30 in Cairo (+3h)
      const result = formatDateTime('2025-06-14T22:30:00.000Z');
      expect(result).toBe('2025-06-15 01:30');
    });

    it('accepts Date objects', () => {
      const d = new Date('2025-06-14T06:42:00.000Z');
      expect(formatDateTime(d)).toBe('2025-06-14 09:42');
    });

    it('allows overriding timezone', () => {
      // UTC timezone check
      const result = formatDateTime('2025-06-14T06:42:00.000Z', 'UTC');
      expect(result).toBe('2025-06-14 06:42');
    });
  });

  describe('formatDate', () => {
    it('returns "—" for null, undefined, empty string, or invalid input', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate(undefined)).toBe('—');
      expect(formatDate('')).toBe('—');
      expect(formatDate('invalid')).toBe('—');
    });

    it('formats date in Africa/Cairo with day rollover', () => {
      // 2025-06-14 22:30 UTC is 2025-06-15 in Cairo
      expect(formatDate('2025-06-14T22:30:00.000Z')).toBe('2025-06-15');
      // 2025-06-14 10:00 UTC is 2025-06-14 in Cairo
      expect(formatDate('2025-06-14T10:00:00.000Z')).toBe('2025-06-14');
    });

    it('accepts Date objects and custom timezone', () => {
      const d = new Date('2025-06-14T23:30:00.000Z');
      expect(formatDate(d, 'UTC')).toBe('2025-06-14');
    });
  });
});
