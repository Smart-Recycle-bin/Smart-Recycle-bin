/**
 * Standard query parameters for server-side paginated endpoints.
 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

/**
 * Server pagination metadata returned alongside paginated arrays.
 */
export interface PageMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Normalized frontend page wrapper containing items and pagination metadata.
 */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
