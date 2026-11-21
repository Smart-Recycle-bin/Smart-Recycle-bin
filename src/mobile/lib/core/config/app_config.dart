class AppConfig {
  AppConfig._();

  /// Set to `true` while the backend API is under development.
  /// When `true`, all repositories and data sources instantly use high-fidelity
  /// mock data matching `EcoBinUI.pdf` without waiting for network timeouts.
  /// Flip to `false` when connecting to the live backend server.
  static const bool useMockData = true;

  /// Development base URL
  static const String apiBaseUrl = 'https://api.ecobin.app/api/v1';

  /// Simulated network latency for mock mode (in milliseconds)
  static const int mockLatencyMs = 250;
}
