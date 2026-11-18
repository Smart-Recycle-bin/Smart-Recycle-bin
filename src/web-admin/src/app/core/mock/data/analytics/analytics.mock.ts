import { BinStatus } from '@models/bin/bin-status.enum';
import { DashboardOverview } from '@models/analytics/analytics.view-model';

export const MOCK_OVERVIEW_7D: DashboardOverview = {
  // Exact values from PDF p2 & p17
  dailyActiveUsers: {
    value: 5540,
    deltaPercent: 4.2,
    trendPositive: true,
  },
  pointsIssued: {
    value: 57959,
    deltaPercent: 8.1,
    trendPositive: true,
  },
  pointsRedeemed: {
    value: 32425,
    deltaPercent: 2.4,
    trendPositive: true,
  },
  contaminationRate: {
    value: 13.0,
    deltaPp: 0.6,
    trendPositive: false,
  },
  binsNeedingServiceCount: 4,
  pendingAiReviewsCount: 5,

  pointsComparisonSeries: [
    { date: '2025-06-08', issued: 9400, redeemed: 3600 },
    { date: '2025-06-09', issued: 9500, redeemed: 3200 },
    { date: '2025-06-10', issued: 9500, redeemed: 3900 },
    { date: '2025-06-11', issued: 7800, redeemed: 4200 },
    { date: '2025-06-12', issued: 7400, redeemed: 4600 },
    { date: '2025-06-13', issued: 8100, redeemed: 5100 },
    { date: '2025-06-14', issued: 8300, redeemed: 4400 },
  ],

  fleetHealth: {
    totalBins: 23,
    available: 14,
    eightyPercentFull: 4,
    needsServicing: 4,
    offline: 1,
  },

  totalRecycledTonnage: 96,
  materialShares: [
    { material: 'Plastic', percentage: 38, tonnage: 36.5 },
    { material: 'Paper', percentage: 24, tonnage: 23.0 },
    { material: 'Glass', percentage: 17, tonnage: 16.3 },
    { material: 'Metal', percentage: 14, tonnage: 13.4 },
    { material: 'Other', percentage: 7, tonnage: 6.8 },
  ],

  contaminationTrend: [
    { date: '2025-06-08', value: 12.4 },
    { date: '2025-06-09', value: 12.8 },
    { date: '2025-06-10', value: 13.5 },
    { date: '2025-06-11', value: 12.9 },
    { date: '2025-06-12', value: 12.6 },
    { date: '2025-06-13', value: 13.2 },
    { date: '2025-06-14', value: 13.0 },
  ],

  dauTrend: [
    { date: '2025-06-08', value: 5310 },
    { date: '2025-06-09', value: 5420 },
    { date: '2025-06-10', value: 5490 },
    { date: '2025-06-11', value: 5380 },
    { date: '2025-06-12', value: 5450 },
    { date: '2025-06-13', value: 5500 },
    { date: '2025-06-14', value: 5540 },
  ],

  urgentBins: [
    {
      binId: 'BIN-0007',
      name: 'Tahrir Square North',
      area: 'Downtown, Cairo',
      fillLevel: 97,
      status: BinStatus.NeedsServicing,
    },
    {
      binId: 'BIN-0038',
      name: 'Ain Shams University',
      area: 'Ain Shams, Cairo',
      fillLevel: 96,
      status: BinStatus.NeedsServicing,
    },
    {
      binId: 'BIN-0061',
      name: 'Shubra El Kheima Market',
      area: 'Shubra El Kheima, Qalyubia',
      fillLevel: 99,
      status: BinStatus.NeedsServicing,
    },
    {
      binId: 'BIN-0084',
      name: 'Sidi Gaber Station',
      area: 'Sidi Gaber, Alexandria',
      fillLevel: 95,
      status: BinStatus.NeedsServicing,
    },
  ],

  urgentReviews: [
    {
      reportId: 'AIR-2048',
      predictedType: 'Plastic (PET)',
      confidence: 0.62,
      feedback: 'The item was a glass bottle, not plastic. Label was misleading.',
    },
    {
      reportId: 'AIR-2047',
      predictedType: 'Paper',
      confidence: 0.71,
      feedback: 'It was a waxed carton - should be mixed packaging.',
    },
    {
      reportId: 'AIR-2046',
      predictedType: 'Metal',
      confidence: 0.55,
      feedback: 'Aluminium foil tray recognised as steel can.',
    },
    {
      reportId: 'AIR-2042',
      predictedType: 'Paper',
      confidence: 0.66,
      feedback: 'Receipt thermal paper is not recyclable.',
    },
    {
      reportId: 'AIR-2041',
      predictedType: 'Plastic (PET)',
      confidence: 0.79,
      feedback: 'Item was a tinted glass jar.',
    },
  ],

  topContaminationHotspots: [
    { category: 'Other', rejectionRate: 23 },
    { category: 'Mixed packaging', rejectionRate: 19 },
    { category: 'Plastic (PET)', rejectionRate: 14 },
    { category: 'Paper', rejectionRate: 11 },
    { category: 'Glass', rejectionRate: 6 },
    { category: 'Metal', rejectionRate: 5 },
  ],
};

export const MOCK_OVERVIEW_TODAY: DashboardOverview = {
  dailyActiveUsers: {
    value: 1820,
    deltaPercent: 2.1,
    trendPositive: true,
  },
  pointsIssued: {
    value: 8300,
    deltaPercent: 3.5,
    trendPositive: true,
  },
  pointsRedeemed: {
    value: 4400,
    deltaPercent: -1.2,
    trendPositive: true,
  },
  contaminationRate: {
    value: 12.8,
    deltaPp: -0.2,
    trendPositive: true,
  },
  binsNeedingServiceCount: 4,
  pendingAiReviewsCount: 5,

  pointsComparisonSeries: [
    { date: '2025-06-14 06:00', issued: 1200, redeemed: 600 },
    { date: '2025-06-14 09:00', issued: 2400, redeemed: 1100 },
    { date: '2025-06-14 12:00', issued: 2100, redeemed: 1300 },
    { date: '2025-06-14 15:00', issued: 2600, redeemed: 1400 },
  ],

  fleetHealth: {
    totalBins: 23,
    available: 14,
    eightyPercentFull: 4,
    needsServicing: 4,
    offline: 1,
  },

  totalRecycledTonnage: 14.5,
  materialShares: [
    { material: 'Plastic', percentage: 40, tonnage: 5.8 },
    { material: 'Paper', percentage: 25, tonnage: 3.6 },
    { material: 'Glass', percentage: 16, tonnage: 2.3 },
    { material: 'Metal', percentage: 13, tonnage: 1.9 },
    { material: 'Other', percentage: 6, tonnage: 0.9 },
  ],

  contaminationTrend: [
    { date: '2025-06-14 06:00', value: 12.2 },
    { date: '2025-06-14 09:00', value: 13.1 },
    { date: '2025-06-14 12:00', value: 12.5 },
    { date: '2025-06-14 15:00', value: 12.8 },
  ],

  dauTrend: [
    { date: '2025-06-14 06:00', value: 420 },
    { date: '2025-06-14 09:00', value: 980 },
    { date: '2025-06-14 12:00', value: 1450 },
    { date: '2025-06-14 15:00', value: 1820 },
  ],

  urgentBins: MOCK_OVERVIEW_7D.urgentBins,
  urgentReviews: MOCK_OVERVIEW_7D.urgentReviews,
  topContaminationHotspots: MOCK_OVERVIEW_7D.topContaminationHotspots,
};

export const MOCK_OVERVIEW_30D: DashboardOverview = {
  dailyActiveUsers: {
    value: 6240,
    deltaPercent: 14.8,
    trendPositive: true,
  },
  pointsIssued: {
    value: 248600,
    deltaPercent: 12.5,
    trendPositive: true,
  },
  pointsRedeemed: {
    value: 138900,
    deltaPercent: 8.2,
    trendPositive: true,
  },
  contaminationRate: {
    value: 12.4,
    deltaPp: -1.2,
    trendPositive: true,
  },
  binsNeedingServiceCount: 4,
  pendingAiReviewsCount: 5,

  pointsComparisonSeries: [
    { date: '2025-05-16', issued: 32000, redeemed: 18000 },
    { date: '2025-05-23', issued: 48000, redeemed: 27000 },
    { date: '2025-05-30', issued: 54000, redeemed: 31000 },
    { date: '2025-06-07', issued: 56641, redeemed: 30475 },
    { date: '2025-06-14', issued: 57959, redeemed: 32425 },
  ],

  fleetHealth: {
    totalBins: 23,
    available: 14,
    eightyPercentFull: 4,
    needsServicing: 4,
    offline: 1,
  },

  totalRecycledTonnage: 395,
  materialShares: [
    { material: 'Plastic', percentage: 39, tonnage: 154 },
    { material: 'Paper', percentage: 23, tonnage: 91 },
    { material: 'Glass', percentage: 18, tonnage: 71 },
    { material: 'Metal', percentage: 13, tonnage: 51 },
    { material: 'Other', percentage: 7, tonnage: 28 },
  ],

  contaminationTrend: [
    { date: '2025-05-16', value: 14.1 },
    { date: '2025-05-23', value: 13.8 },
    { date: '2025-05-30', value: 13.2 },
    { date: '2025-06-07', value: 12.8 },
    { date: '2025-06-14', value: 13.0 },
  ],

  dauTrend: [
    { date: '2025-05-16', value: 4800 },
    { date: '2025-05-23', value: 5050 },
    { date: '2025-05-30', value: 5240 },
    { date: '2025-06-07', value: 5410 },
    { date: '2025-06-14', value: 5540 },
  ],

  urgentBins: MOCK_OVERVIEW_7D.urgentBins,
  urgentReviews: MOCK_OVERVIEW_7D.urgentReviews,
  topContaminationHotspots: MOCK_OVERVIEW_7D.topContaminationHotspots,
};
