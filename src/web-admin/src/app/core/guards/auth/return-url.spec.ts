import { describe, it, expect } from 'vitest';
import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  interface TestCase {
    input: string | null | undefined;
    expected: string | null;
    description: string;
  }

  const testCases: TestCase[] = [
    // Valid internal relative paths
    { input: '/overview', expected: '/overview', description: 'standard root-relative route' },
    { input: '/bins', expected: '/bins', description: 'simple path' },
    { input: '/bins/map?lat=30.0&lng=31.2', expected: '/bins/map?lat=30.0&lng=31.2', description: 'path with query parameters' },
    { input: '/review-queue#detail', expected: '/review-queue#detail', description: 'path with hash fragment' },
    { input: '/admin/users/U-10021?status=active#tab', expected: '/admin/users/U-10021?status=active#tab', description: 'nested path with query and hash' },
    { input: '   /overview   ', expected: '/overview', description: 'valid path with surrounding whitespace' },

    // Invalid / Malicious inputs
    { input: null, expected: null, description: 'null value' },
    { input: undefined, expected: null, description: 'undefined value' },
    { input: '', expected: null, description: 'empty string' },
    { input: '   ', expected: null, description: 'whitespace only' },
    { input: 'http://evil.com', expected: null, description: 'absolute http URL' },
    { input: 'https://evil.com', expected: null, description: 'absolute https URL' },
    { input: 'https://evil.com/bins', expected: null, description: 'absolute https URL with path' },
    { input: '//evil.com', expected: null, description: 'protocol-relative URL' },
    { input: '//evil.com/overview', expected: null, description: 'protocol-relative URL with path' },
    { input: '/\\evil.com', expected: null, description: 'mixed slash-backslash bypass' },
    { input: '\\evil.com', expected: null, description: 'windows backslash path' },
    { input: 'javascript:alert(1)', expected: null, description: 'javascript scheme' },
    { input: 'data:text/html,<script>alert(1)</script>', expected: null, description: 'data URI scheme' },
    { input: 'overview', expected: null, description: 'relative path without leading slash' },
    { input: 'bins/map', expected: null, description: 'relative multi-segment path without leading slash' },
    { input: '/test\n/inject', expected: null, description: 'path containing newline control character' },
    { input: '/test\r\ninject', expected: null, description: 'path containing CRLF' },
  ];

  testCases.forEach(({ input, expected, description }) => {
    it(`should return ${JSON.stringify(expected)} for ${description} (${JSON.stringify(input)})`, () => {
      expect(safeReturnUrl(input)).toBe(expected);
    });
  });
});
