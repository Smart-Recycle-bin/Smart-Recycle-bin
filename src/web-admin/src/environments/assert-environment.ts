import type { Environment } from './environment.model';

/**
 * Validates the runtime application environment configuration.
 *
 * Ensures that `apiBaseUrl` is non-empty and properly configured.
 * If validation fails, throws a descriptive Error halting application startup.
 */
export function assertEnvironment(env: Environment): void {
  if (!env.apiBaseUrl || env.apiBaseUrl.trim() === '') {
    throw new Error(
      'Environment assertion failed: apiBaseUrl cannot be empty.'
    );
  }
}
