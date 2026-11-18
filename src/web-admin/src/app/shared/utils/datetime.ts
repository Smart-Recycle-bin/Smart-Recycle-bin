import { environment } from '@env/environment';

export type DateInput = string | Date | null | undefined;

function toValidDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

/**
 * Formats a date/timestamp to 'YYYY-MM-DD HH:mm' (24-hour) in the configured display timezone.
 * Returns '—' on null, undefined, empty, or invalid input. Never throws.
 */
export function formatDateTime(
  value: DateInput,
  timeZone: string = environment.displayTimeZone
): string {
  const date = toValidDate(value);
  if (!date) {
    return '—';
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    let year = '';
    let month = '';
    let day = '';
    let hour = '';
    let minute = '';

    for (const part of parts) {
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
          hour = part.value.padStart(2, '0');
          break;
        case 'minute':
          minute = part.value.padStart(2, '0');
          break;
      }
    }

    if (hour === '24') {
      hour = '00';
    }

    if (!year || !month || !day || !hour || !minute) {
      return '—';
    }

    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return '—';
  }
}

/**
 * Formats a date to 'YYYY-MM-DD' in the configured display timezone.
 * Returns '—' on null, undefined, empty, or invalid input. Never throws.
 */
export function formatDate(
  value: DateInput,
  timeZone: string = environment.displayTimeZone
): string {
  const date = toValidDate(value);
  if (!date) {
    return '—';
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    let year = '';
    let month = '';
    let day = '';

    for (const part of parts) {
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
      }
    }

    if (!year || !month || !day) {
      return '—';
    }

    return `${year}-${month}-${day}`;
  } catch {
    return '—';
  }
}
