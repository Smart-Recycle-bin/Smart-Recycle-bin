import type { Environment } from './environment.model';

/**
 * Validates the runtime application environment configuration.
 *
 * In production builds, this asserts that:
 * 1. `useMockBackend` is strictly false (preventing mock backend / mock data leaking to production).
 * 2. `apiBaseUrl` is non-empty.
 *
 * If any check fails, it throws a descriptive Error halting application startup.
 */
export function assertEnvironment(env: Environment): void {
  if (env.production) {
    if (env.useMockBackend) {
      throw new Error(
        'Production environment assertion failed: useMockBackend cannot be enabled in production.'
      );
    }
    if (env.mockLiveDrift || env.mockXssBinSeed || (env.mockBinCount && env.mockBinCount > 0)) {
      throw new Error(
        'Production environment assertion failed: mock testing flags cannot be active in production.'
      );
    }
    if (!env.apiBaseUrl || env.apiBaseUrl.trim() === '') {
      throw new Error(
        'Production environment assertion failed: apiBaseUrl cannot be empty in production.'
      );
    }
  }
}
