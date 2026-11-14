/**
 * EcoBin Central API Endpoints registry.
 * All paths are relative to environment.apiBaseUrl (/api/v1).
 * PROPOSED endpoints carry a comment reference to their entry in gap_api.md.
 */
export const API_ENDPOINTS = {
  auth: {
    // APIs.md 2.2 / gap_api.md 1.1: Sys Admin login support
    login: '/auth/login',
    // APIs.md 2.3 / gap_api.md 1.1: Sys Admin logout & token revocation
    logout: '/auth/logout',
    // PROPOSED (gap_api.md 1.1): Token refresh with single-use rotation
    refresh: '/auth/refresh',
    // APIs.md 2.4: Password reset trigger
    forgotPassword: '/auth/forgot-password',
  },
  user: {
    // PROPOSED (gap_api.md 1.4): Recycler moderation list
    recyclers: '/admin/recyclers',
    // APIs.md 2.7: Suspend user account
    suspend: (userId: string) => `/admin/users/${userId}/suspend`,
    // APIs.md 2.8: Unsuspend user account
    unsuspend: (userId: string) => `/admin/users/${userId}/unsuspend`,
  },
  collector: {
    // PROPOSED (gap_api.md 1.5): Collectors list
    list: '/admin/collectors',
    // APIs.md 2.5 / gap_api.md 1.5: Provision collector
    create: '/admin/collectors',
    // PROPOSED (gap_api.md 1.5): Update collector
    update: (collectorId: string) => `/admin/collectors/${collectorId}`,
    // PROPOSED (gap_api.md 1.5): View collector assigned bins
    assignedBins: (collectorId: string) => `/admin/collectors/${collectorId}/bins`,
    // PROPOSED (gap_api.md 1.5): Deactivate collector account
    deactivate: (collectorId: string) => `/admin/collectors/${collectorId}/deactivate`,
  },
  bin: {
    // PROPOSED (gap_api.md 1.3): Admin smart bins fleet list and map data
    list: '/admin/bins',
    // APIs.md 2.11: Register new smart bin
    register: '/admin/bins',
    // APIs.md 2.12: Assign collector to smart bin
    assign: (binId: string) => `/admin/bins/${binId}/assign`,
  },
  analytics: {
    // PROPOSED (gap_api.md 1.2): Operational overview dashboard KPIs & series
    overview: '/admin/analytics/overview',
  },
  inspection: {
    // PROPOSED (gap_api.md 1.6): Retraining dataset metrics & queue counters
    summary: '/admin/inspections/summary',
    // PROPOSED (gap_api.md 1.6): Flagged inspection reports review queue
    list: '/admin/inspections',
    // PROPOSED (gap_api.md 1.6): Detailed inspection report with captured frames
    detail: (reportId: string) => `/admin/inspections/${reportId}`,
    // PROPOSED (gap_api.md 1.6): Correct waste category prediction
    correct: (reportId: string) => `/admin/inspections/${reportId}/correct`,
    // PROPOSED (gap_api.md 1.6): Dismiss report (ML inference was correct)
    dismiss: (reportId: string) => `/admin/inspections/${reportId}/dismiss`,
    // PROPOSED (gap_api.md 1.6): Send report to retraining dataset
    retrain: (reportId: string) => `/admin/inspections/${reportId}/retrain`,
    // PROPOSED (gap_api.md 1.6): Available waste categories for reclassification
    wasteTypes: '/admin/waste-types',
  },
  survey: {
    // PROPOSED (gap_api.md 1.7): Survey QA summary, KPIs, trends, and recent rows
    qa: '/admin/survey-qa',
    // PROPOSED (gap_api.md 1.7): Recent post-disposal survey list
    recent: '/admin/survey-qa/recent',
  },
  wallet: {
    // PROPOSED (gap_api.md 1.8): Global immutable financial ledger
    ledger: '/admin/ledger',
    // APIs.md 2.9: Manual points adjustment
    adjust: '/admin/ledger/adjust',
  },
  reward: {
    // PROPOSED (gap_api.md 1.9): Admin rewards catalog list
    list: '/admin/rewards',
    // APIs.md 2.13 / gap_api.md 1.9: Create reward item
    create: '/admin/rewards',
    // APIs.md 2.14 / gap_api.md 1.9: Update reward item
    update: (rewardId: string) => `/admin/rewards/${rewardId}`,
    // APIs.md 2.15: Archive reward item
    archive: (rewardId: string) => `/admin/rewards/${rewardId}/archive`,
    // PROPOSED (gap_api.md 1.9): Upload reward image asset
    uploadImage: '/admin/rewards/upload-image',
  },
  gamification: {
    // PROPOSED (gap_api.md 1.10): Leaderboard ranking by scope
    leaderboard: '/admin/leaderboard',
    // PROPOSED (gap_api.md 1.10): Milestone badges catalog
    badges: '/admin/badges',
  },
  audit: {
    // PROPOSED (gap_api.md 1.11): Administrative audit trail
    list: '/admin/audit-logs',
  },
  notification: {
    // PROPOSED (gap_api.md 1.12): Admin notifications feed
    list: '/admin/notifications',
    // PROPOSED (gap_api.md 1.12): Mark single notification as read
    markRead: (id: string) => `/admin/notifications/${id}/read`,
    // PROPOSED (gap_api.md 1.12): Mark all notifications as read
    markAllRead: '/admin/notifications/mark-all-read',
  },
} as const;
