/**
 * Validates and sanitizes a return URL to prevent open redirect vulnerabilities.
 * Accepts only internal relative paths starting with a single leading slash.
 * Rejects protocol-relative URLs (//), full URLs (http:, https:, javascript:),
 * backslashes, and empty inputs.
 */
export function safeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Must start with exactly one leading slash and not '//'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  // Reject backslashes (browsers normalize \ to / which can allow /\evil.com bypasses)
  if (trimmed.includes('\\')) {
    return null;
  }

  // Reject schemes (e.g. javascript:, http:, https:, data:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return null;
  }

  // Reject control characters or newlines
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return null;
  }

  return trimmed;
}
