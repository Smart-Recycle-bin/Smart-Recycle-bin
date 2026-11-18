import { describe, it, expect, beforeEach } from 'vitest';
import { BinStatus } from '@models/bin/bin-status.enum';
import { InspectionReportStatus } from '@models/inspection/inspection-report-status.enum';
import { getMockDb, resetMockDb } from './mock-db';

describe('Mock Database (mock-db)', () => {
  beforeEach(() => {
    resetMockDb();
  });

  it('should provide singleton instance via getMockDb()', () => {
    const db1 = getMockDb();
    const db2 = getMockDb();
    expect(db1).toBe(db2);
  });

  it('should have exact counts for each primary collection', () => {
    const db = getMockDb();
    expect(db.recyclers.length).toBe(14);
    expect(db.collectors.length).toBe(6);
    expect(db.bins.length).toBe(23);
    expect(db.rewards.length).toBe(8);
    expect(db.auditLogs.length).toBe(10);
    expect(db.ledger.length).toBe(15);
    expect(db.notifications.length).toBe(9);
    expect(db.inspectionReports.length).toBe(8);
    expect(db.badges.length).toBe(5);
  });

  it('should maintain unique identifiers across all entities in each dataset', () => {
    const db = getMockDb();

    const adminIds = db.admins.map((a) => a.user.userId);
    expect(new Set(adminIds).size).toBe(adminIds.length);

    const recyclerIds = db.recyclers.map((r) => r.userId);
    expect(new Set(recyclerIds).size).toBe(recyclerIds.length);

    const collectorIds = db.collectors.map((c) => c.collectorId);
    expect(new Set(collectorIds).size).toBe(collectorIds.length);

    const binIds = db.bins.map((b) => b.binId);
    expect(new Set(binIds).size).toBe(binIds.length);

    const reportIds = db.inspectionReports.map((r) => r.reportId);
    expect(new Set(reportIds).size).toBe(reportIds.length);

    const rewardIds = db.rewards.map((rw) => rw.itemId);
    expect(new Set(rewardIds).size).toBe(rewardIds.length);

    const badgeIds = db.badges.map((bdg) => bdg.badgeId);
    expect(new Set(badgeIds).size).toBe(badgeIds.length);

    const notifIds = db.notifications.map((n) => n.id);
    expect(new Set(notifIds).size).toBe(notifIds.length);

    const auditIds = db.auditLogs.map((aud) => aud.auditId);
    expect(new Set(auditIds).size).toBe(auditIds.length);

    const txIds = db.ledger.map((tx) => tx.transactionId);
    expect(new Set(txIds).size).toBe(txIds.length);
  });

  it('should ensure bin.collectorId references an existing collector', () => {
    const db = getMockDb();
    const validCollectorIds = new Set(db.collectors.map((c) => c.collectorId));

    for (const bin of db.bins) {
      if (bin.collectorId) {
        expect(validCollectorIds.has(bin.collectorId)).toBe(true);
      }
    }
  });

  it('should ensure ledger.userId references an existing recycler', () => {
    const db = getMockDb();
    const validRecyclerIds = new Set(db.recyclers.map((r) => r.userId));

    for (const row of db.ledger) {
      expect(validRecyclerIds.has(row.userId)).toBe(true);
    }
  });

  it('should ensure inspection report binId references an existing bin', () => {
    const db = getMockDb();
    const validBinIds = new Set(db.bins.map((b) => b.binId));

    for (const report of db.inspectionReports) {
      expect(validBinIds.has(report.binId)).toBe(true);
    }
  });

  it('should ensure audit log adminId references an existing admin', () => {
    const db = getMockDb();
    const validAdminIds = new Set(db.admins.map((a) => a.user.userId));

    for (const log of db.auditLogs) {
      expect(validAdminIds.has(log.adminId)).toBe(true);
    }
  });

  it('should satisfy fleet count constraints (23 total: 14 Available, 4 ≥80%, 4 ≥95%, 1 Offline)', () => {
    const db = getMockDb();
    expect(db.bins.length).toBe(23);

    const available = db.bins.filter((b) => b.status === BinStatus.Available).length;
    const eightyFull = db.bins.filter((b) => b.status === BinStatus.EightyPercentFull).length;
    const needsServicing = db.bins.filter((b) => b.status === BinStatus.NeedsServicing).length;
    const offline = db.bins.filter((b) => b.status === BinStatus.Offline).length;

    expect(available).toBe(14);
    expect(eightyFull).toBe(4);
    expect(needsServicing).toBe(4);
    expect(offline).toBe(1);

    // Greater Cairo: 16 bins (10 Available, 3 ≥80%, 3 ≥95%, 0 Offline)
    const cairoRegionBins = db.bins.filter((b) => b.region === 'Greater Cairo');
    expect(cairoRegionBins.length).toBe(16);
    expect(cairoRegionBins.filter((b) => b.status === BinStatus.Available).length).toBe(10);
    expect(cairoRegionBins.filter((b) => b.status === BinStatus.EightyPercentFull).length).toBe(3);
    expect(cairoRegionBins.filter((b) => b.status === BinStatus.NeedsServicing).length).toBe(3);
    expect(cairoRegionBins.filter((b) => b.status === BinStatus.Offline).length).toBe(0);

    // Alexandria: 7 bins (4 Available, 1 ≥80%, 1 ≥95%, 1 Offline)
    const alexRegionBins = db.bins.filter((b) => b.region === 'Alexandria');
    expect(alexRegionBins.length).toBe(7);
    expect(alexRegionBins.filter((b) => b.status === BinStatus.Available).length).toBe(4);
    expect(alexRegionBins.filter((b) => b.status === BinStatus.EightyPercentFull).length).toBe(1);
    expect(alexRegionBins.filter((b) => b.status === BinStatus.NeedsServicing).length).toBe(1);
    expect(alexRegionBins.filter((b) => b.status === BinStatus.Offline).length).toBe(1);
  });

  it('should have exactly 5 pending inspection reports matching sidebar badge count', () => {
    const db = getMockDb();
    const pendingCount = db.inspectionReports.filter(
      (r) => r.status === InspectionReportStatus.Pending
    ).length;
    expect(pendingCount).toBe(5);
  });

  it('should ensure each ledger row balance equals the user available points', () => {
    const db = getMockDb();
    const recyclerMap = new Map(db.recyclers.map((r) => [r.userId, r]));

    for (const row of db.ledger) {
      const user = recyclerMap.get(row.userId);
      expect(user).toBeDefined();
      expect(row.runningBalance).toBe(user!.availablePoints);
    }
  });

  it('should restore seeds and empty refreshTokens on resetMockDb()', () => {
    const db = getMockDb();
    db.refreshTokens.push({
      token: 'test_token',
      userId: 'ADM-001',
      familyId: 'fam_1',
      expiresAt: '2025-06-15T00:00:00Z',
      usedAt: null,
      revokedAt: null,
    });
    expect(db.refreshTokens.length).toBe(1);

    db.recyclers[0]!.name = 'Modified Name';

    const freshDb = resetMockDb();
    expect(freshDb.refreshTokens.length).toBe(0);
    expect(freshDb.recyclers[0]!.name).toBe('Nour El-Sayed');
  });
});
