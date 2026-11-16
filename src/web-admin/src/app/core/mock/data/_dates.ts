/**
 * Converts a Cairo local date/time string (e.g. '2025-06-14 09:42' or '2024-02-11')
 * into an ISO 8601 UTC string with 'Z', such that formatting it in Africa/Cairo
 * produces the original local time.
 */
export function cairoLocalToIso(localStr: string): string {
  if (!localStr) {
    return localStr;
  }
  // Idempotent check: if already ISO UTC with Z or offset
  if (localStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(localStr)) {
    return new Date(localStr).toISOString();
  }

  const match = localStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) {
    return new Date(localStr).toISOString();
  }

  const [, y, m, d, h = '00', min = '00', s = '00'] = match;
  const targetUtcMs = Date.UTC(+y, +m - 1, +d, +h, +min, +s);

  // Determine Cairo offset at targetUtcMs
  const dObj = new Date(targetUtcMs);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let year = '';
  let month = '';
  let day = '';
  let hour = '';
  let minute = '';
  let second = '';

  for (const part of formatter.formatToParts(dObj)) {
    switch (part.type) {
      case 'year':
        year = part.value;
        break;
      case 'month':
        month = part.value;
        break;
      case 'day':
        day = part.value;
        break;
      case 'hour':
        hour = part.value;
        break;
      case 'minute':
        minute = part.value;
        break;
      case 'second':
        second = part.value;
        break;
    }
  }

  if (hour === '24') {
    hour = '00';
  }
  const cairoUtcMs = Date.UTC(
    +year,
    +month - 1,
    +day,
    +hour,
    +minute,
    +second
  );
  const offsetMs = cairoUtcMs - targetUtcMs;

  return new Date(targetUtcMs - offsetMs).toISOString();
}
