import { describe, it, expect } from 'vitest';
import { formatSignedPoints, initials, pluralize, pluralNoun } from './format';

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

  describe('pluralize', () => {
    it('pluralizes nouns with count 1 correctly', () => {
      expect(pluralize(1, 'item')).toBe('1 item');
      expect(pluralize(1, 'bin')).toBe('1 bin');
      expect(pluralize(1, 'district', 'districts')).toBe('1 district');
    });

    it('pluralizes nouns with count 0 or >1 correctly', () => {
      expect(pluralize(0, 'item')).toBe('0 items');
      expect(pluralize(2, 'item')).toBe('2 items');
      expect(pluralize(23, 'smart bin')).toBe('23 smart bins');
      expect(pluralize(4, 'district', 'districts')).toBe('4 districts');
    });
  });

  describe('pluralNoun', () => {
    it('returns singular form when count is 1', () => {
      expect(pluralNoun(1, 'bin')).toBe('bin');
      expect(pluralNoun(1, 'item')).toBe('item');
    });

    it('returns plural form when count is 0 or >1', () => {
      expect(pluralNoun(0, 'bin')).toBe('bins');
      expect(pluralNoun(2, 'bin')).toBe('bins');
      expect(pluralNoun(4, 'category', 'categories')).toBe('categories');
    });
  });
});
