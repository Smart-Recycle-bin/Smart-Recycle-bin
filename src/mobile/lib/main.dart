import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Core
import 'core/config/app_config.dart';
import 'core/network/api_client.dart';
import 'core/storage/token_storage.dart';
import 'core/theme/app_theme.dart';

// Auth Feature
import 'features/auth/data/datasources/auth_remote_data_source.dart';
import 'features/auth/data/repositories/auth_repository_impl.dart';
import 'features/auth/presentation/viewmodels/auth_viewmodel.dart';
import 'features/auth/presentation/views/login_view.dart';

// Map & Bins Feature
import 'features/map_bins/data/datasources/bins_remote_data_source.dart';
import 'features/map_bins/data/repositories/bins_repository_impl.dart';
import 'features/map_bins/presentation/viewmodels/map_bins_viewmodel.dart';

// Scan & Active Session Feature
import 'features/scan_session/data/datasources/session_remote_data_source.dart';
import 'features/scan_session/data/repositories/session_repository_impl.dart';
import 'features/scan_session/presentation/viewmodels/active_session_viewmodel.dart';

// Survey Feature
import 'features/survey/data/datasources/survey_remote_data_source.dart';
import 'features/survey/data/repositories/survey_repository_impl.dart';
import 'features/survey/presentation/viewmodels/surveys_list_viewmodel.dart';
import 'features/survey/presentation/viewmodels/verify_survey_viewmodel.dart';

// Marketplace Feature
import 'features/marketplace/data/datasources/marketplace_remote_data_source.dart';
import 'features/marketplace/data/repositories/marketplace_repository_impl.dart';
import 'features/marketplace/presentation/viewmodels/marketplace_viewmodel.dart';

// Wallet Feature
import 'features/wallet/data/datasources/wallet_remote_data_source.dart';
import 'features/wallet/data/repositories/wallet_repository_impl.dart';
import 'features/wallet/presentation/viewmodels/wallet_viewmodel.dart';

// Profile Feature
import 'features/profile/data/datasources/profile_remote_data_source.dart';
import 'features/profile/data/repositories/profile_repository_impl.dart';
import 'features/profile/presentation/viewmodels/profile_viewmodel.dart';

// Shell
import 'features/shell/presentation/views/main_shell_view.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final sharedPrefs = await SharedPreferences.getInstance();
  final tokenStorage = TokenStorage(sharedPrefs);
  final apiClient = ApiClient(
    tokenStorage: tokenStorage,
    baseUrl: AppConfig.apiBaseUrl,
  );

  // Repositories
  final authRepository = AuthRepositoryImpl(
    remoteDataSource: AuthRemoteDataSourceImpl(apiClient: apiClient),
    tokenStorage: tokenStorage,
  );

  final binsRepository = BinsRepositoryImpl(
    remoteDataSource: BinsRemoteDataSourceImpl(apiClient: apiClient),
  );

  final sessionRepository = SessionRepositoryImpl(
    remoteDataSource: SessionRemoteDataSourceImpl(apiClient: apiClient),
  );

  final surveyRepository = SurveyRepositoryImpl(
    remoteDataSource: SurveyRemoteDataSourceImpl(apiClient: apiClient),
  );

  final marketplaceRepository = MarketplaceRepositoryImpl(
    remoteDataSource: MarketplaceRemoteDataSourceImpl(apiClient: apiClient),
  );

  final walletRepository = WalletRepositoryImpl(
    remoteDataSource: WalletRemoteDataSourceImpl(apiClient: apiClient),
  );

  final profileRepository = ProfileRepositoryImpl(
    remoteDataSource: ProfileRemoteDataSourceImpl(apiClient: apiClient),
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthViewModel(authRepository: authRepository)..init(),
        ),
        ChangeNotifierProvider(
          create: (_) => MapBinsViewModel(binsRepository: binsRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => ActiveSessionViewModel(sessionRepository: sessionRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => SurveysListViewModel(surveyRepository: surveyRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => VerifySurveyViewModel(surveyRepository: surveyRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => MarketplaceViewModel(
            marketplaceRepository: marketplaceRepository,
            walletRepository: walletRepository,
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => WalletViewModel(walletRepository: walletRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => ProfileViewModel(profileRepository: profileRepository),
        ),
      ],
      child: EcoBinApp(isAuthenticated: tokenStorage.isAuthenticated),
    ),
  );
}

class EcoBinApp extends StatelessWidget {
  final bool isAuthenticated;

  const EcoBinApp({super.key, required this.isAuthenticated});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EcoBin',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: isAuthenticated ? const MainShellView() : const LoginView(),
    );
  }
}
