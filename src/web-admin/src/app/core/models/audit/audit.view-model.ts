// GAP: see gap_api.md → Admin Audit Trail (UI p16)
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { AuditActionType } from './audit-action-type.enum';

/**
 * Filter query parameters for the audit logs screen (UI p16).
 */
export interface AuditLogQuery extends PageQuery {
  adminId?: string;
  actionType?: AuditActionType;
  resourceId?: string;
  from?: string; // ISO date string
  to?: string;   // ISO date string
}

/**
 * Enriched audit log row item displayed on the Audit Logs table (UI p16).
 */
export interface AuditLogRow {
  auditId: Id;
  timestamp: string; // ISO 8601 string
  adminId: Id;
  adminName: string;
  adminInitials: string;
  actionType: AuditActionType;
  resourceId: string;
  justification: string;
  ipAddress: string;
}
