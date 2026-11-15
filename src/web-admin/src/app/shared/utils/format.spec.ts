import { describe, it, expect } from 'vitest';
import { formatSignedPoints, initials } from './format';

describe('format utilities', () => {
  describe('formatSignedPoints', () => {
    it('formats positive values with plus sign and comma separators', () => {
      expect(formatSignedPoints(85)).toBe('+85');
      expect(formatSignedPoints(1500)).toBe('+1,500');
      expect(formatSignedPoints(25000)).toBe('+25,000');
    });

    it('formats negative values with typographical minus and comma separators', () => {
      expect(formatSignedPoints(-1500)).toBe('−1,500');
      expect(formatSignedPoints(-420)).toBe('−420');
      expect(formatSignedPoints(-1000000)).toBe('−1,000,000');
    });

    it('formats zero as 0 without sign', () => {
      expect(formatSignedPoints(0)).toBe('0');
      expect(formatSignedPoints(-0)).toBe('0');
    });
  });

  describe('initials', () => {
    it('extracts two uppercase letters from multi-word names', () => {
      expect(initials('Nour El-Sayed')).toBe('NE');
      expect(initials('Laila Hamdy')).toBe('LH');
      expect(initials('Ahmed Mostafa Ali')).toBe('AM');
    });

    it('extracts single uppercase letter from single-word names', () => {
      expect(initials('Admin')).toBe('A');
      expect(initials('EcoBin')).toBe('E');
    });

    it('handles empty or nullish strings gracefully', () => {
      expect(initials('')).toBe('');
      expect(initials('   ')).toBe('');
      expect(initials(null)).toBe('');
      expect(initials(undefined)).toBe('');
    });
  });
});
