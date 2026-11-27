import 'package:dio/dio.dart';

String extractDioErrorMessage(DioException e, String fallback) {
  final data = e.response?.data;
  if (data is Map && data['error'] is Map) {
    final msg = data['error']['message']?.toString();
    if (msg != null && msg.isNotEmpty) return msg;
  }
  return fallback;
}
