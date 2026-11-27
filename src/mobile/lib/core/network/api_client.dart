import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../constants/api_endpoints.dart';
import '../storage/token_storage.dart';

class ApiClient {
  static const _publicAuthSegments = <String>[
    '/auth/login',
    '/auth/register',
    '/auth/refresh-token',
    '/auth/verify-email',
    '/auth/resend-otp',
    '/auth/forgot-password',
    '/auth/verify-reset-otp',
    '/auth/reset-password',
  ];

  late final Dio dio;
  final TokenStorage tokenStorage;
  VoidCallback? onSessionExpired;

  Future<String?>? _refreshFuture;
  bool _sessionExpiredEmitted = false;

  ApiClient({
    required this.tokenStorage,
    String? baseUrl,
    this.onSessionExpired,
  }) {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      ),
    );

    _setupInterceptors();
  }

  bool _isAuthEndpoint(String path) {
    final normalized = path.toLowerCase();
    return _publicAuthSegments.any(normalized.contains);
  }

  Future<void> _expireSession() async {
    await tokenStorage.clear();
    if (!_sessionExpiredEmitted) {
      _sessionExpiredEmitted = true;
      onSessionExpired?.call();
    }
  }

  /// Coalesces concurrent 401 refreshes so rotated single-use refresh tokens
  /// are never spent multiple times in parallel.
  Future<String?> _refreshAccessTokenSingleFlight(String refreshToken) async {
    if (_refreshFuture != null) {
      return _refreshFuture!;
    }

    final future = _performRefresh(refreshToken);
    _refreshFuture = future;
    try {
      return await future;
    } finally {
      if (identical(_refreshFuture, future)) {
        _refreshFuture = null;
      }
    }
  }

  Future<String?> _performRefresh(String usedRefreshToken) async {
    // Another request may have rotated tokens just before this call ran.
    final latestRefresh = tokenStorage.getRefreshToken();
    if (latestRefresh != null && latestRefresh.isNotEmpty && latestRefresh != usedRefreshToken) {
      return tokenStorage.getAccessToken();
    }

    try {
      final refreshDio = Dio(
        BaseOptions(
          baseUrl: dio.options.baseUrl,
          connectTimeout: dio.options.connectTimeout,
          receiveTimeout: dio.options.receiveTimeout,
          headers: const {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'ngrok-skip-browser-warning': 'true',
          },
        ),
      )..httpClientAdapter = dio.httpClientAdapter;

      final refreshResponse = await refreshDio.post(
        ApiEndpoints.refreshToken,
        data: {'refreshToken': usedRefreshToken},
      );

      if (refreshResponse.statusCode == 200 &&
          refreshResponse.data is Map &&
          refreshResponse.data['success'] == true) {
        final data = refreshResponse.data['data'] as Map<String, dynamic>;
        final newAccessToken = data['accessToken'] as String;
        final newRefreshToken = data['refreshToken'] as String?;

        await tokenStorage.saveTokens(
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        );
        _sessionExpiredEmitted = false;
        return newAccessToken;
      }
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      // Clear tokens only when the server explicitly rejects the refresh token,
      // and only if another concurrent call did not just rotate it.
      if (status == 400 || status == 401 || status == 403) {
        final currentRefresh = tokenStorage.getRefreshToken();
        if (currentRefresh == null || currentRefresh == usedRefreshToken) {
          await _expireSession();
        } else {
          return tokenStorage.getAccessToken();
        }
      }
    } catch (_) {
      // Transient/parsing failures must not wipe valid stored tokens.
    }

    return null;
  }

  void _setupInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = tokenStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            _sessionExpiredEmitted = false;
            if (!options.headers.containsKey('Authorization')) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          final originalRequest = error.requestOptions;
          if (error.response?.statusCode != 401 ||
              _isAuthEndpoint(originalRequest.path) ||
              originalRequest.extra['_authRetried'] == true) {
            return handler.next(error);
          }

          final failedAuthHeader = originalRequest.headers['Authorization']?.toString();
          final currentStoredToken = tokenStorage.getAccessToken();

          if (currentStoredToken != null &&
              currentStoredToken.isNotEmpty &&
              failedAuthHeader != 'Bearer $currentStoredToken') {
            originalRequest.headers['Authorization'] = 'Bearer $currentStoredToken';
            originalRequest.extra['_authRetried'] = true;
            try {
              final retryResponse = await dio.fetch(originalRequest);
              return handler.resolve(retryResponse);
            } on DioException catch (retryError) {
              return handler.next(retryError);
            }
          }

          final refreshToken = tokenStorage.getRefreshToken();
          if (refreshToken == null || refreshToken.isEmpty) {
            await _expireSession();
            return handler.next(error);
          }

          final newAccessToken = await _refreshAccessTokenSingleFlight(refreshToken);
          if (newAccessToken != null && newAccessToken.isNotEmpty) {
            originalRequest.headers['Authorization'] = 'Bearer $newAccessToken';
            originalRequest.extra['_authRetried'] = true;
            try {
              final retryResponse = await dio.fetch(originalRequest);
              return handler.resolve(retryResponse);
            } on DioException catch (retryError) {
              return handler.next(retryError);
            }
          }

          return handler.next(error);
        },
      ),
    );
  }
}
