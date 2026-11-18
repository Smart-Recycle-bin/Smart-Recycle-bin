import { HttpClient, HttpContext, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@models/common/api-response.dto';
import { Page, PageQuery } from '@models/common/page.model';

export interface RequestOptions {
  params?: Record<string, unknown> | HttpParams;
  headers?: HttpHeaders | Record<string, string | string[]>;
  context?: HttpContext;
}

@Injectable({
  providedIn: 'root',
})
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  /**
   * Performs an HTTP GET request, unwrapping ApiResponse<T> to T.
   */
  get<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    const url = this.resolveUrl(endpoint);
    const httpParams = this.buildParams(options?.params);

    return this.http
      .get<ApiResponse<T>>(url, {
        params: httpParams,
        headers: options?.headers,
        context: options?.context,
      })
      .pipe(map((res) => this.unwrapData<T>(res)));
  }

  /**
   * Performs an HTTP GET request on a paginated list endpoint,
   * reading data and meta to return a unified Page<T>.
   * If meta is absent, derives pagination metadata from the array.
   */
  getPaged<T>(
    endpoint: string,
    query?: PageQuery | Record<string, unknown>,
    options?: RequestOptions
  ): Observable<Page<T>> {
    const url = this.resolveUrl(endpoint);
    const combinedParams = {
      ...(query as Record<string, unknown>),
      ...(options?.params as Record<string, unknown>),
    };
    const httpParams = this.buildParams(combinedParams);

    return this.http
      .get<ApiResponse<T[]>>(url, {
        params: httpParams,
        headers: options?.headers,
        context: options?.context,
      })
      .pipe(
        map((res) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          if (res?.meta) {
            return {
              items,
              page: res.meta.page,
              pageSize: res.meta.pageSize,
              totalItems: res.meta.totalItems,
              totalPages: res.meta.totalPages,
            };
          }
          return {
            items,
            page: 1,
            pageSize: items.length || 10,
            totalItems: items.length,
            totalPages: 1,
          };
        })
      );
  }

  /**
   * Performs an HTTP POST request, unwrapping ApiResponse<T> to T.
   */
  post<T>(endpoint: string, body: unknown = {}, options?: RequestOptions): Observable<T> {
    const url = this.resolveUrl(endpoint);
    const httpParams = this.buildParams(options?.params);

    return this.http
      .post<ApiResponse<T>>(url, body, {
        params: httpParams,
        headers: options?.headers,
        context: options?.context,
      })
      .pipe(map((res) => this.unwrapData<T>(res)));
  }

  /**
   * Performs an HTTP PUT request, unwrapping ApiResponse<T> to T.
   */
  put<T>(endpoint: string, body: unknown = {}, options?: RequestOptions): Observable<T> {
    const url = this.resolveUrl(endpoint);
    const httpParams = this.buildParams(options?.params);

    return this.http
      .put<ApiResponse<T>>(url, body, {
        params: httpParams,
        headers: options?.headers,
        context: options?.context,
      })
      .pipe(map((res) => this.unwrapData<T>(res)));
  }

  /**
   * Performs an HTTP PATCH request, unwrapping ApiResponse<T> to T.
   */
  patch<T>(endpoint: string, body: unknown = {}, options?: RequestOptions): Observable<T> {
    const url = this.resolveUrl(endpoint);
    const httpParams = this.buildParams(options?.params);

    return this.http
      .patch<ApiResponse<T>>(url, body, {
        params: httpParams,
        headers: options?.headers,
        context: options?.context,
      })
      .pipe(map((res) => this.unwrapData<T>(res)));
  }

  /**
   * Performs an HTTP DELETE request, unwrapping ApiResponse<T> to T.
   */
  delete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    const url = this.resolveUrl(endpoint);
    const httpParams = this.buildParams(options?.params);

    return this.http
      .delete<ApiResponse<T>>(url, {
        params: httpParams,
        headers: options?.headers,
        context: options?.context,
      })
      .pipe(map((res) => this.unwrapData<T>(res)));
  }

  /**
   * Resolves endpoint against the API base URL.
   */
  private resolveUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  /**
   * Constructs HttpParams from a record, skipping undefined, null, or empty string values.
   */
  private buildParams(params?: Record<string, unknown> | HttpParams): HttpParams | undefined {
    if (!params) {
      return undefined;
    }
    if (params instanceof HttpParams) {
      return params;
    }

    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }

  /**
   * Unwraps the standard { success: true, data: T } envelope to T.
   */
  private unwrapData<T>(response: ApiResponse<T>): T {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as ApiResponse<T>).data;
    }
    return response as unknown as T;
  }
}
