import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, isObservable, from, of } from 'rxjs';

export type MockResponse = HttpResponse<unknown> | HttpErrorResponse;

export interface MockRequestContext<T = unknown> {
  req: HttpRequest<T>;
  params: Record<string, string>;
  query: URLSearchParams;
}

export type MockRouteResult = MockResponse | Promise<MockResponse> | Observable<MockResponse>;

export type MockRouteHandler<T = unknown> = (
  context: MockRequestContext<T>
) => MockRouteResult;

interface RouteDefinition {
  method: string;
  pathPattern: string;
  paramNames: string[];
  regex: RegExp;
  handler: MockRouteHandler<unknown>;
}

export class MockRouter {
  private readonly routes: RouteDefinition[] = [];

  register<T = unknown>(
    method: string,
    pathPattern: string,
    handler: MockRouteHandler<T>
  ): void {
    const paramNames: string[] = [];
    // Convert :param to capture groups
    const escapedPattern = pathPattern
      .replace(/:([a-zA-Z0-9_]+)/g, (_, paramName: string) => {
        paramNames.push(paramName);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${escapedPattern}$`);

    this.routes.push({
      method: method.toUpperCase(),
      pathPattern,
      paramNames,
      regex,
      handler: handler as MockRouteHandler<unknown>,
    });
  }

  get<T = unknown>(path: string, handler: MockRouteHandler<T>): void {
    this.register('GET', path, handler);
  }

  post<T = unknown>(path: string, handler: MockRouteHandler<T>): void {
    this.register('POST', path, handler);
  }

  put<T = unknown>(path: string, handler: MockRouteHandler<T>): void {
    this.register('PUT', path, handler);
  }

  patch<T = unknown>(path: string, handler: MockRouteHandler<T>): void {
    this.register('PATCH', path, handler);
  }

  delete<T = unknown>(path: string, handler: MockRouteHandler<T>): void {
    this.register('DELETE', path, handler);
  }

  match(req: HttpRequest<unknown>): {
    handler: MockRouteHandler<unknown>;
    context: MockRequestContext<unknown>;
  } | null {
    const method = req.method.toUpperCase();

    // Parse URL path and query
    // req.urlWithParams or req.url
    const rawUrl = req.urlWithParams || req.url;
    const urlObj = new URL(rawUrl, 'http://localhost');
    const pathname = urlObj.pathname;
    const query = urlObj.searchParams;

    for (const route of this.routes) {
      if (route.method !== method) {
        continue;
      }

      const match = pathname.match(route.regex);
      if (match) {
        const params: Record<string, string> = {};
        for (let i = 0; i < route.paramNames.length; i++) {
          const name = route.paramNames[i];
          if (name) {
            params[name] = decodeURIComponent(match[i + 1] ?? '');
          }
        }

        return {
          handler: route.handler,
          context: {
            req,
            params,
            query,
          },
        };
      }
    }

    return null;
  }

  execute(
    req: HttpRequest<unknown>
  ): Observable<MockResponse> | null {
    const match = this.match(req);
    if (!match) {
      return null;
    }

    try {
      const result = match.handler(match.context);
      if (isObservable(result)) {
        return result;
      }
      if (result instanceof Promise) {
        return from(result);
      }
      return of(result);
    } catch (err: unknown) {
      if (err instanceof HttpErrorResponse) {
        return of(err);
      }
      return of(
        new HttpErrorResponse({
          status: 500,
          statusText: 'Internal Server Error',
          error: {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          },
          url: req.url,
        })
      );
    }
  }
}
