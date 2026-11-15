/**
 * Utility formatting functions for EcoBin UI displays.
 */

/**
 * Formats points delta with explicit sign and thousands separator,
 * matching UI screen p8 conventions (+85, −1,500).
 * Uses the typographical minus sign (\u2212) for negative values.
 */
export function formatSignedPoints(points: number): string {
  if (points === 0 || Object.is(points, -0)) {
    return '0';
  }

  const formattedAbs = new Intl.NumberFormat('en-US').format(Math.abs(points));

  if (points > 0) {
    return `+${formattedAbs}`;
  }

  return `\u2212${formattedAbs}`;
}

/**
 * Derives up to 2 uppercase initials from a user's full name.
 * Handles single names, multi-part names, and empty inputs cleanly.
 */
export function initials(name: string | null | undefined): string {
  if (!name) {
    return '';
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '';
  }

  if (parts.length === 1) {
    return (parts[0]?.[0] ?? '').toUpperCase();
  }

  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return `${first}${second}`.toUpperCase();
}
