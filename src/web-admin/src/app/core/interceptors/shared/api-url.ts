import { environment } from '@env/environment';

/**
 * Resolves the centralized backend API v1 base URL from environment.apiBaseUrl.
 * Supports both host-only values (e.g. http://localhost:5121) and values already
 * ending with /api/v1 without duplicating or dropping path segments.
 */
export function resolveApiBaseUrl(): string {
  const raw = environment.apiBaseUrl.trim().replace(/\/+$/, '');
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

/**
 * Checks whether an HTTP request URL targets the EcoBin API endpoint hierarchy.
 */
export function isApiUrl(url: string): boolean {
  const apiRoot = resolveApiBaseUrl();
  return url.startsWith(apiRoot) || url.startsWith('/api/v1');
}
