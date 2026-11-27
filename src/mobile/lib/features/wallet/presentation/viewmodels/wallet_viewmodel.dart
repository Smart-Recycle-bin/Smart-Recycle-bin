import 'package:flutter/foundation.dart';
import '../../domain/entities/ledger_entry_entity.dart';
import '../../domain/repositories/wallet_repository.dart';

class WalletViewModel extends ChangeNotifier {
  final WalletRepository walletRepository;

  WalletViewModel({required this.walletRepository});

  int _availablePoints = 0;
  int _lifetimeEarnedPoints = 0;
  List<LedgerEntryEntity> _entries = [];
  String _activeFilter = 'All'; // 'All', 'Earned', 'Spent'
  bool _isLoading = false;
  String? _errorMessage;

  int get availablePoints => _availablePoints;
  int get lifetimeEarnedPoints => _lifetimeEarnedPoints;
  double get cashValueEgp => _availablePoints / 100.0;
  List<LedgerEntryEntity> get entries => _entries;
  String get activeFilter => _activeFilter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  List<LedgerEntryEntity> get filteredEntries {
    if (_activeFilter == 'Earned') {
      return _entries.where((e) => e.isCredit).toList();
    } else if (_activeFilter == 'Spent') {
      return _entries.where((e) => !e.isCredit).toList();
    }
    return _entries;
  }

  Future<void> init() async {
    await fetchWalletData();
  }

  Future<void> fetchWalletData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final balanceResult = await walletRepository.getWalletBalance();
    final ledgerResult = await walletRepository.getLedger();

    _isLoading = false;

    balanceResult.when(
      onSuccess: (data) {
        _availablePoints = (data['availablePoints'] as num?)?.toInt() ?? _availablePoints;
        _lifetimeEarnedPoints =
            (data['lifetimeEarnedPoints'] as num?)?.toInt() ?? _lifetimeEarnedPoints;
      },
      onFailure: (error) => _errorMessage = error.replaceFirst('Exception: ', ''),
    );

    ledgerResult.when(
      onSuccess: (list) {
        _entries = list;
      },
      onFailure: (error) => _errorMessage = error.replaceFirst('Exception: ', ''),
    );

    notifyListeners();
  }

  void syncAvailablePoints(int points) {
    if (_availablePoints == points) return;
    _availablePoints = points;
    notifyListeners();
  }

  void setFilter(String filter) {
    _activeFilter = filter;
    notifyListeners();
  }
}
