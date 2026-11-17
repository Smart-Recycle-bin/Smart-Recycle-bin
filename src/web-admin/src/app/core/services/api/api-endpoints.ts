/**
 * EcoBin Central API Endpoints registry.
 * All paths are relative to environment.apiBaseUrl (/api/v1).
 * PROPOSED endpoints carry a comment reference to their entry in gap_api.md.
 */
export const API_ENDPOINTS = {
  auth: {
    // APIs.md 2.1: Sys Admin login
    login: '/auth/login',
    // APIs.md 2.3: Sys Admin logout & token revocation
    logout: '/auth/logout',
    // APIs.md 2.2: Token refresh with single-use rotation
    refresh: '/auth/refresh',
    // APIs.md 2.4: Password reset trigger
    forgotPassword: '/auth/forgot-password',
  },
  user: {
    // APIs.md 2.11 / gap_api.md 1.4: User search filtered for recyclers
    recyclers: '/admin/users',
    // APIs.md 2.13: Suspend user account
    suspend: (userId: string) => `/admin/users/${userId}/suspend`,
    // APIs.md 2.14: Unsuspend user account
    unsuspend: (userId: string) => `/admin/users/${userId}/unsuspend`,
  },
  collector: {
    // PROPOSED (gap_api.md 1.5): Collectors list
    list: '/admin/collectors',
    // APIs.md 2.7: Provision collector
    create: '/admin/collectors',
    // PROPOSED (gap_api.md 1.5): Update collector
    update: (collectorId: string) => `/admin/collectors/${collectorId}`,
    // PROPOSED (gap_api.md 1.5): View collector assigned bins
    assignedBins: (collectorId: string) => `/admin/collectors/${collectorId}/bins`,
    // PROPOSED (gap_api.md 1.5): Deactivate collector account
    deactivate: (collectorId: string) => `/admin/collectors/${collectorId}/deactivate`,
  },
  bin: {
    // PROPOSED (gap_api.md 1.3): Admin smart bins fleet list
    list: '/admin/bins',
    // PROPOSED (gap_api.md 1.3): Live bin map data feed
    map: '/admin/bins/map',
    // APIs.md 7.1: Register new smart bin
    register: '/admin/bins',
    // APIs.md 7.3: Assign collector to smart bin
    assign: (binId: string) => `/admin/bins/${binId}/assignment`,
  },
  analytics: {
    // APIs.md 7.9: Operational analytics overview KPIs
    overview: '/admin/analytics',
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
    // APIs.md 5.3: Global immutable financial ledger
    ledger: '/admin/ledger',
    // APIs.md 5.4: Manual points adjustment
    adjust: '/admin/ledger/adjustments',
  },
  reward: {
    // PROPOSED (gap_api.md 1.9): Admin rewards catalog list
    list: '/admin/catalog',
    // APIs.md 6.2: Create reward item
    create: '/admin/catalog',
    // APIs.md 6.3: Update reward item
    update: (itemId: string) => `/admin/catalog/${itemId}`,
    // APIs.md 6.4: Archive reward item
    archive: (itemId: string) => `/admin/catalog/${itemId}/archive`,
    // PROPOSED (gap_api.md 1.9): Upload reward image asset
    uploadImage: '/admin/catalog/upload-image',
  },
  gamification: {
    // APIs.md 5.5: Leaderboard ranking by scope
    leaderboard: '/leaderboard',
    // PROPOSED (gap_api.md 1.10): Milestone badges catalog
    badges: '/admin/badges',
  },
  audit: {
    // APIs.md 7.8: Administrative audit trail
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
