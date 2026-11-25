import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _keyAccessToken = 'ecobin_access_token';
  static const _keyRefreshToken = 'ecobin_refresh_token';
  static const _keyUserData = 'ecobin_user_data';

  final SharedPreferences _prefs;

  TokenStorage(this._prefs);

  static Future<TokenStorage> init() async {
    final prefs = await SharedPreferences.getInstance();
    return TokenStorage(prefs);
  }

  String? getAccessToken() => _prefs.getString(_keyAccessToken);

  String? getRefreshToken() => _prefs.getString(_keyRefreshToken);

  Future<void> saveTokens({required String accessToken, String? refreshToken}) async {
    await _prefs.setString(_keyAccessToken, accessToken);
    if (refreshToken != null) {
      await _prefs.setString(_keyRefreshToken, refreshToken);
    }
  }

  Future<void> saveUserData(Map<String, dynamic> userData) async {
    await _prefs.setString(_keyUserData, jsonEncode(userData));
  }

  Map<String, dynamic>? getUserData() {
    final raw = _prefs.getString(_keyUserData);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  bool get isAuthenticated => getAccessToken() != null;

  Future<void> clear() async {
    await _prefs.remove(_keyAccessToken);
    await _prefs.remove(_keyRefreshToken);
    await _prefs.remove(_keyUserData);
  }
}
