/**
 * Standard API success response envelope per APIs.md.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}
