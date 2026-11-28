class AppConfig {
  AppConfig._();

  /// Set to `true` while the backend API is under development.
  /// When `true`, all repositories and data sources instantly use high-fidelity
  /// mock data matching `EcoBinUI.pdf` without waiting for network timeouts.
  /// Flip to `false` when connecting to the live backend server.
  static const bool useMockData = false;

  /// Default backend base URL (ngrok HTTPS tunnel so mobile & IoT work across networks).
  /// Override locally with `--dart-define=API_BASE_URL=http://localhost:5121/api/v1`.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://lacewing-exotic-elf.ngrok-free.app/api/v1',
  );

  /// Simulated network latency for mock mode (in milliseconds)
  static const int mockLatencyMs = 250;
}
