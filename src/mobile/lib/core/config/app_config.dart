class AppConfig {
  AppConfig._();

  /// Set to `true` while the backend API is under development.
  /// When `true`, all repositories and data sources instantly use high-fidelity
  /// mock data matching `EcoBinUI.pdf` without waiting for network timeouts.
  /// Flip to `false` when connecting to the live backend server.
  static const bool useMockData = false;

  /// Development base URL
  /// Supported when running `adb reverse tcp:5121 tcp:5121`:
  static const String apiBaseUrl = 'http://localhost:5121/api/v1';

  /// Simulated network latency for mock mode (in milliseconds)
  static const int mockLatencyMs = 250;
}
