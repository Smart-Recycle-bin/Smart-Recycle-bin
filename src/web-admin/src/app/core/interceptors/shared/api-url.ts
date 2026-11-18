import { environment } from '@env/environment';

/**
 * Checks whether an HTTP request URL targets the EcoBin API endpoint hierarchy.
 */
export function isApiUrl(url: string): boolean {
  return url.startsWith(environment.apiBaseUrl) || url.startsWith('/api/v1');
}
