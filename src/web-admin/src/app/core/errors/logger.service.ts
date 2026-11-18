import { inject, Injectable, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@env/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  stack?: string;
  route?: string;
  appVersion: string;
  userId?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface ErrorReporter {
  report(entry: LogEntry): void;
}

export const ERROR_REPORTER = new InjectionToken<ErrorReporter>('ERROR_REPORTER');

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_REGEX = /token|password|secret|authorization|auth|cookie|credential|key/i;
const JWT_OR_BEARER_REGEX = /Bearer\s+[A-Za-z0-9-_=.]+|eyJ[A-Za-z0-9-_=.]+\.[A-Za-z0-9-_=.]+/g;

/**
 * Sanitizes arbitrary log context, ensuring tokens, passwords, and sensitive credentials
 * are never leaked into logs or error reporters.
 */
export function sanitizeLogValue(val: unknown, depth = 0): unknown {
  if (depth > 5) return '[NESTED_OBJECT]';
  if (val === null || val === undefined) return val;

  if (typeof val === 'string') {
    return val.replace(JWT_OR_BEARER_REGEX, REDACTED);
  }

  if (typeof val === 'number' || typeof val === 'boolean') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => sanitizeLogValue(item, depth + 1));
  }

  if (typeof val === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        cleaned[k] = REDACTED;
      } else {
        cleaned[k] = sanitizeLogValue(v, depth + 1);
      }
    }
    return cleaned;
  }

  return String(val);
}

@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly router = inject(Router, { optional: true });
  private readonly errorReporter = inject(ERROR_REPORTER, { optional: true });

  private currentUserId?: string;

  setUserId(userId: string | undefined): void {
    this.currentUserId = userId;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, undefined, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, undefined, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    let stack: string | undefined;
    let combinedMessage = message;

    if (error instanceof Error) {
      stack = error.stack;
      combinedMessage = `${message}: ${error.message}`;
    } else if (error) {
      combinedMessage = `${message}: ${String(error)}`;
    }

    this.log('error', combinedMessage, stack, context);
  }

  private log(
    level: LogLevel,
    message: string,
    stack?: string,
    context?: Record<string, unknown>
  ): void {
    const sanitizedContext = context ? (sanitizeLogValue(context) as Record<string, unknown>) : undefined;
    const sanitizedMessage = typeof message === 'string' ? message.replace(JWT_OR_BEARER_REGEX, REDACTED) : String(message);
    const sanitizedStack = stack ? stack.replace(JWT_OR_BEARER_REGEX, REDACTED) : undefined;

    const entry: LogEntry = {
      level,
      message: sanitizedMessage,
      stack: sanitizedStack,
      route: this.router?.url,
      appVersion: environment.appVersion || '1.0.0',
      userId: this.currentUserId,
      timestamp: new Date().toISOString(),
      context: sanitizedContext,
    };

    // 1. Console in development
    if (!environment.production) {
      const consoleFn = console[level] ?? console.log;
      consoleFn(`[${entry.level.toUpperCase()}] ${entry.message}`, {
        route: entry.route,
        appVersion: entry.appVersion,
        context: entry.context,
        stack: entry.stack,
      });
    }

    // 2. Pluggable error reporter for errors
    if (level === 'error' && this.errorReporter) {
      try {
        this.errorReporter.report(entry);
      } catch {
        // Reporter failure should never crash the application
      }
    }
  }
}
