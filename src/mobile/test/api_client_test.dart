import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/storage/token_storage.dart';

class FakeHttpClientAdapter implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions options) handler;

  FakeHttpClientAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) {
    return handler(options);
  }

  @override
  void close({bool force = false}) {}
}

ResponseBody _jsonResponse(Map<String, dynamic> body, int statusCode) {
  return ResponseBody.fromString(
    jsonEncode(body),
    statusCode,
    headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    },
  );
}

void main() {
  test(
    'concurrent 401 responses trigger only one /auth/refresh and return refreshed wallet balance',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final tokenStorage = TokenStorage(prefs);
      await tokenStorage.saveTokens(
        accessToken: 'expired-jwt',
        refreshToken: 'refresh-token-1',
      );

      var sessionExpiredCalls = 0;
      final apiClient = ApiClient(
        tokenStorage: tokenStorage,
        baseUrl: 'http://localhost:5121/api/v1',
        onSessionExpired: () => sessionExpiredCalls++,
      );

      var refreshCallCount = 0;
      apiClient.dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
        if (options.path.endsWith('/auth/refresh-token')) {
          refreshCallCount++;
          // Fail if backend sees the same single-use token more than once.
          if (refreshCallCount > 1) {
            return _jsonResponse({'success': false}, 401);
          }
          await Future<void>.delayed(const Duration(milliseconds: 25));
          return _jsonResponse({
            'success': true,
            'data': {
              'accessToken': 'fresh-jwt-2',
              'refreshToken': 'refresh-token-2',
            },
          }, 200);
        }

        final authHeader = options.headers['Authorization']?.toString();
        if (authHeader != 'Bearer fresh-jwt-2') {
          return _jsonResponse({'success': false}, 401);
        }

        if (options.path.endsWith('/wallet/balance')) {
          return _jsonResponse({
            'success': true,
            'data': {'availablePoints': 500000, 'lifetimeEarnedPoints': 1000},
          }, 200);
        }

        return _jsonResponse({
          'success': true,
          'data': {'items': []},
        }, 200);
      });

      final responses = await Future.wait([
        apiClient.dio.get('/wallet/balance'),
        apiClient.dio.get('/wallet/ledger'),
        apiClient.dio.get('/catalog/vouchers'),
      ]);

      expect(refreshCallCount, 1);
      expect(sessionExpiredCalls, 0);
      expect(tokenStorage.getAccessToken(), 'fresh-jwt-2');
      expect(tokenStorage.getRefreshToken(), 'refresh-token-2');
      expect(responses[0].data['data']['availablePoints'], 500000);
    },
  );

  test(
    'transient 500 during /auth/refresh does not wipe valid stored tokens',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final tokenStorage = TokenStorage(prefs);
      await tokenStorage.saveTokens(
        accessToken: 'expired-jwt',
        refreshToken: 'refresh-token-1',
      );

      var sessionExpiredCalls = 0;
      final apiClient = ApiClient(
        tokenStorage: tokenStorage,
        baseUrl: 'http://localhost:5121/api/v1',
        onSessionExpired: () => sessionExpiredCalls++,
      );

      apiClient.dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
        if (options.path.endsWith('/auth/refresh-token')) {
          return _jsonResponse({'success': false}, 500);
        }
        return _jsonResponse({'success': false}, 401);
      });

      await expectLater(
        () => apiClient.dio.get('/wallet/balance'),
        throwsA(isA<DioException>()),
      );

      expect(tokenStorage.getAccessToken(), 'expired-jwt');
      expect(tokenStorage.getRefreshToken(), 'refresh-token-1');
      expect(sessionExpiredCalls, 0);
    },
  );

  test(
    'genuine 401 on /auth/refresh clears tokens and emits onSessionExpired once',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final tokenStorage = TokenStorage(prefs);
      await tokenStorage.saveTokens(
        accessToken: 'expired-jwt',
        refreshToken: 'revoked-refresh-token',
      );

      var sessionExpiredCalls = 0;
      final apiClient = ApiClient(
        tokenStorage: tokenStorage,
        baseUrl: 'http://localhost:5121/api/v1',
        onSessionExpired: () => sessionExpiredCalls++,
      );

      apiClient.dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
        return _jsonResponse({'success': false}, 401);
      });

      await expectLater(
        Future.wait([
          apiClient.dio.get('/wallet/balance'),
          apiClient.dio.get('/wallet/ledger'),
        ]),
        throwsA(isA<DioException>()),
      );

      expect(tokenStorage.getAccessToken(), isNull);
      expect(tokenStorage.getRefreshToken(), isNull);
      expect(sessionExpiredCalls, 1);
    },
  );

  test(
    '401 from /auth/login does not trigger refresh or session expiration',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final tokenStorage = TokenStorage(prefs);

      var sessionExpiredCalls = 0;
      var refreshCalls = 0;
      final apiClient = ApiClient(
        tokenStorage: tokenStorage,
        baseUrl: 'http://localhost:5121/api/v1',
        onSessionExpired: () => sessionExpiredCalls++,
      );

      apiClient.dio.httpClientAdapter = FakeHttpClientAdapter((options) async {
        if (options.path.endsWith('/auth/refresh-token')) {
          refreshCalls++;
        }
        return _jsonResponse({'success': false}, 401);
      });

      await expectLater(
        () => apiClient.dio.post('/auth/login', data: {}),
        throwsA(isA<DioException>()),
      );

      expect(refreshCalls, 0);
      expect(sessionExpiredCalls, 0);
    },
  );
}
