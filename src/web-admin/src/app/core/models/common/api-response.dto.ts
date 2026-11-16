import { PageMeta } from './page.model';

/**
 * Standard API success response envelope per APIs.md, optionally carrying
 * server-side pagination metadata.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}
