import { Id } from '../common/id.model';

export interface DistrictLookupItem {
  name: string;
  region: string | null;
}

export interface CollectorLookupItem {
  collectorId: Id;
  displayName: string;
}

export interface AdminLookupItem {
  adminId: Id;
  displayName: string;
}
