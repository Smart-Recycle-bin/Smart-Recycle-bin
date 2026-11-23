import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/storage/token_storage.dart';
import 'package:ecobin/features/auth/data/datasources/auth_remote_data_source.dart';
import 'package:ecobin/features/auth/data/repositories/auth_repository_impl.dart';
import 'package:ecobin/features/auth/presentation/viewmodels/auth_viewmodel.dart';
import 'package:ecobin/features/auth/presentation/views/login_view.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('EcoBin login smoke test', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final tokenStorage = TokenStorage(prefs);
    final apiClient = ApiClient(tokenStorage: tokenStorage);
    final authRepo = AuthRepositoryImpl(
      remoteDataSource: AuthRemoteDataSourceImpl(apiClient: apiClient),
      tokenStorage: tokenStorage,
    );
    final authVm = AuthViewModel(authRepository: authRepo);

    await tester.pumpWidget(
      ChangeNotifierProvider<AuthViewModel>.value(
        value: authVm,
        child: const MaterialApp(
          home: LoginView(),
        ),
      ),
    );

    // Verify UI components from EcoBinUI.pdf Page 2
    expect(find.text('Login'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Sign up'), findsOneWidget);
    expect(find.text('Forget Password'), findsOneWidget);
  });
}
