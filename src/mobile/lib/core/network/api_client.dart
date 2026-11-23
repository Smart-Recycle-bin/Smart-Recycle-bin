import 'package:dio/dio.dart';
import '../constants/api_endpoints.dart';
import '../storage/token_storage.dart';

class ApiClient {
  late final Dio dio;
  final TokenStorage tokenStorage;

  ApiClient({required this.tokenStorage, String? baseUrl}) {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _setupInterceptors();
  }

  void _setupInterceptors() {
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = tokenStorage.getAccessToken();
          if (token != null && !options.headers.containsKey('Authorization')) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Check for 401 Unauthorized for token refresh attempt
          if (error.response?.statusCode == 401) {
            final refreshToken = tokenStorage.getRefreshToken();
            if (refreshToken != null) {
              try {
                // Attempt to refresh the JWT access token
                final refreshResponse = await Dio(
                  BaseOptions(baseUrl: dio.options.baseUrl),
                ).post(
                  ApiEndpoints.refreshToken,
                  data: {'refreshToken': refreshToken},
                );

                if (refreshResponse.statusCode == 200 &&
                    refreshResponse.data['success'] == true) {
                  final newAccessToken =
                      refreshResponse.data['data']['accessToken'] as String;
                  final newRefreshToken =
                      refreshResponse.data['data']['refreshToken'] as String?;

                  await tokenStorage.saveTokens(
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                  );

                  // Retry the original failed request with the new access token
                  final originalRequest = error.requestOptions;
                  originalRequest.headers['Authorization'] = 'Bearer $newAccessToken';

                  final retryResponse = await dio.fetch(originalRequest);
                  return handler.resolve(retryResponse);
                }
              } catch (_) {
                // If refresh token fails/expired, clear storage to force re-login
                await tokenStorage.clear();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }
}
