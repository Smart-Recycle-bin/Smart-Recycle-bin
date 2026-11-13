/**
 * Unspecified error response body shape (logged as open question in gap_api.md Section 3).
 * Supports both nested `{ error: { code, message } }` and flat `{ code, message }`.
 */
export interface ApiErrorBody {
  success: false;
  error?: {
    code: string;
    message?: string;
  };
  code?: string;
  message?: string;
}
