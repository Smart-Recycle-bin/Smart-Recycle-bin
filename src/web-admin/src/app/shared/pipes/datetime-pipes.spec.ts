import { describe, expect, it } from 'vitest';
import { DateOnlyPipe } from './date-only.pipe';
import { DateTimePipe } from './date-time.pipe';

describe('DateTimePipe and DateOnlyPipe', () => {
  const dateTimePipe = new DateTimePipe();
  const dateOnlyPipe = new DateOnlyPipe();

  it('DateTimePipe delegates to formatDateTime with Africa/Cairo default', () => {
    expect(dateTimePipe.transform(null)).toBe('—');
    expect(dateTimePipe.transform('2025-06-14T06:42:00.000Z')).toBe('2025-06-14 09:42');
    expect(dateTimePipe.transform('2025-06-14T06:42:00.000Z', 'UTC')).toBe('2025-06-14 06:42');
  });

  it('DateOnlyPipe delegates to formatDate with Africa/Cairo default', () => {
    expect(dateOnlyPipe.transform(null)).toBe('—');
    expect(dateOnlyPipe.transform('2025-06-14T22:30:00.000Z')).toBe('2025-06-15');
    expect(dateOnlyPipe.transform('2025-06-14T22:30:00.000Z', 'UTC')).toBe('2025-06-14');
  });
});
