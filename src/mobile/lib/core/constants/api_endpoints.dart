class ApiEndpoints {
  ApiEndpoints._();

  // Configurable base URL (e.g. localhost for development emulator / web or staging)
  static const String baseUrl = 'https://api.ecobin.app/api/v1';

  // 1. Authentication & IAM
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String logout = '/auth/logout';
  static const String verifyEmail = '/auth/verify-email';
  static const String resendVerificationOtp = '/auth/resend-verification-otp';
  static const String forgotPassword = '/auth/forgot-password';
  static const String verifyResetOtp = '/auth/verify-reset-otp';
  static const String resetPassword = '/auth/reset-password';
  static const String changePassword = '/auth/password';
  static const String refreshToken = '/auth/refresh-token';

  // Profile
  static const String profile = '/profile';
  static const String uploadAvatar = '/profile/photo';

  // 2. Map & Bins
  static const String getBins = '/bins';
  static const String searchBins = '/bins/search';
  static String binDetails(String binId) => '/bins/$binId';

  // 3. QR Scanning & Active Sessions
  static String startSession(String binId) => '/bins/$binId/sessions';
  static String getSession(String sessionId) => '/sessions/$sessionId';
  static String endSession(String sessionId) => '/sessions/$sessionId/end';

  // 4. Surveys
  static const String getSurveys = '/surveys';
  static String getSessionSurvey(String sessionId) => '/sessions/$sessionId/survey';
  static String submitSurvey(String surveyId) => '/surveys/$surveyId/submit';
  static String confirmSurvey(String sessionId) => '/sessions/$sessionId/survey/confirm';
  static String rejectSurvey(String sessionId) => '/sessions/$sessionId/survey/reject';

  // 5. Wallet & Financial Ledger
  static const String walletBalance = '/wallet/balance';
  static const String walletLedger = '/wallet/ledger';
  static const String leaderboard = '/leaderboard';
  static const String achievements = '/achievements';

  // 6. Marketplace & Rewards
  static const String catalog = '/catalog';
  static const String spotlightBanners = '/catalog/featured';
  static String catalogItemDetails(String itemId) => '/catalog/$itemId';
  static String redeemReward(String itemId) => '/catalog/$itemId/redemptions';
  static const String myVouchers = '/vouchers';

  // 7. Support & Legal
  static const String submitSupportTicket = '/support/tickets';
  static String legalDoc(String documentKey) => '/legal/$documentKey';
}
