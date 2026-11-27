import 'package:flutter/foundation.dart';
import '../../domain/entities/catalog_item_entity.dart';
import '../../domain/entities/redeemed_voucher_entity.dart';
import '../../domain/repositories/marketplace_repository.dart';
import '../../../wallet/domain/repositories/wallet_repository.dart';

class MarketplaceViewModel extends ChangeNotifier {
  final MarketplaceRepository marketplaceRepository;
  final WalletRepository? walletRepository;

  MarketplaceViewModel({
    required this.marketplaceRepository,
    this.walletRepository,
  }) : _balancePoints = walletRepository == null ? 1420 : 0;

  List<CatalogItemEntity> _items = [];
  List<SpotlightBannerEntity> _banners = [];
  List<RedeemedVoucherEntity> _myVouchers = [];
  int _balancePoints;
  bool _isLoading = false;
  bool _isLoadingVouchers = false;
  String? _errorMessage;
  String? _vouchersErrorMessage;
  String _voucherStatusFilter = 'all';

  CatalogItemEntity? _selectedItem;
  VoucherDenomination? _selectedDenomination;

  List<CatalogItemEntity> get items => _items;
  List<SpotlightBannerEntity> get banners => _banners;
  List<RedeemedVoucherEntity> get myVouchers => _myVouchers;
  int get balancePoints => _balancePoints;
  double get cashValueEgp => _balancePoints / 100.0;
  bool get isLoading => _isLoading;
  bool get isLoadingVouchers => _isLoadingVouchers;
  String? get errorMessage => _errorMessage;
  String? get vouchersErrorMessage => _vouchersErrorMessage;
  String get voucherStatusFilter => _voucherStatusFilter;

  CatalogItemEntity? get selectedItem => _selectedItem;
  VoucherDenomination? get selectedDenomination => _selectedDenomination;

  int get balanceAfterRedemption {
    if (_selectedDenomination == null) return _balancePoints;
    return _balancePoints - _selectedDenomination!.pointsCost;
  }

  void syncBalancePoints(int points) {
    if (_balancePoints == points) return;
    _balancePoints = points;
    notifyListeners();
  }

  Future<void> init() async {
    await fetchMarketplaceData();
  }

  Future<void> fetchMarketplaceData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final catalogFuture = marketplaceRepository.getCatalog();
    final bannersFuture = marketplaceRepository.getSpotlightBanners();
    final balanceFuture = walletRepository?.getWalletBalance();

    final catalogResult = await catalogFuture;
    final bannersResult = await bannersFuture;
    if (balanceFuture != null) {
      final balanceResult = await balanceFuture;
      balanceResult.when(
        onSuccess: (data) {
          _balancePoints = (data['availablePoints'] as num?)?.toInt() ?? _balancePoints;
        },
        onFailure: (_) {},
      );
    }

    _isLoading = false;

    catalogResult.when(
      onSuccess: (data) => _items = data,
      onFailure: (error) => _errorMessage = error.replaceFirst('Exception: ', ''),
    );

    bannersResult.when(
      onSuccess: (data) => _banners = data,
      onFailure: (_) {},
    );

    notifyListeners();
  }

  void selectItemForRedemption(CatalogItemEntity item) {
    _selectedItem = item;
    _errorMessage = null;
    if (item.denominations.isNotEmpty) {
      _selectedDenomination = item.denominations.firstWhere(
        (d) => d.inStock,
        orElse: () => item.denominations.first,
      );
    } else {
      _selectedDenomination = VoucherDenomination(
        itemId: item.itemId,
        label: item.title,
        valueEgp: item.defaultPointsCost >= 100 ? item.defaultPointsCost ~/ 100 : 10,
        pointsCost: item.defaultPointsCost,
        inStock: item.inStock,
      );
    }
    notifyListeners();
  }

  /// Selects an item and refreshes full category options from `/catalog/{itemId}`.
  Future<void> openItemForRedemption(CatalogItemEntity item) async {
    selectItemForRedemption(item);
    final detailResult = await marketplaceRepository.getItemDetails(item.itemId);
    detailResult.when(
      onSuccess: (detail) {
        if (_selectedItem?.itemId == item.itemId) {
          _selectedItem = detail;
          if (detail.denominations.isNotEmpty) {
            _selectedDenomination = detail.denominations.firstWhere(
              (d) => d.inStock,
              orElse: () => detail.denominations.first,
            );
          }
          notifyListeners();
        }
      },
      onFailure: (_) {},
    );
  }

  void selectDenomination(VoucherDenomination denomination) {
    if (!denomination.inStock) return;
    _selectedDenomination = denomination;
    _errorMessage = null;
    notifyListeners();
  }

  Future<String?> redeemSelected() async {
    if (_selectedItem == null || _selectedDenomination == null) return null;

    if (!_selectedDenomination!.inStock) {
      _errorMessage = 'Selected reward option is currently out of stock.';
      notifyListeners();
      return null;
    }

    if (_balancePoints < _selectedDenomination!.pointsCost) {
      _errorMessage = 'Insufficient EcoPoints balance for this voucher';
      notifyListeners();
      return null;
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetItemId = _selectedDenomination!.itemId ?? _selectedItem!.itemId;
    final result = await marketplaceRepository.redeemReward(
      itemId: targetItemId,
      denominationEgp: _selectedDenomination!.valueEgp,
      pointsCost: _selectedDenomination!.pointsCost,
    );

    String? redeemedCode;
    result.when(
      onSuccess: (voucherCode) {
        redeemedCode = voucherCode;
      },
      onFailure: (error) {
        _errorMessage = error.replaceFirst('Exception: ', '');
      },
    );

    if (redeemedCode != null) {
      if (walletRepository != null) {
        final refreshed = await walletRepository!.getWalletBalance();
        refreshed.when(
          onSuccess: (data) {
            _balancePoints = (data['availablePoints'] as num?)?.toInt() ??
                (_balancePoints - _selectedDenomination!.pointsCost);
          },
          onFailure: (_) {
            _balancePoints -= _selectedDenomination!.pointsCost;
          },
        );
      } else {
        _balancePoints -= _selectedDenomination!.pointsCost;
      }
    }

    _isLoading = false;
    notifyListeners();
    return redeemedCode;
  }

  Future<void> setVoucherFilter(String status) async {
    _voucherStatusFilter = status;
    await fetchMyVouchers(status: status);
  }

  Future<void> fetchMyVouchers({String? status}) async {
    final activeFilter = status ?? _voucherStatusFilter;
    _isLoadingVouchers = true;
    _vouchersErrorMessage = null;
    notifyListeners();

    final result = await marketplaceRepository.getMyVouchers(
      status: activeFilter == 'all' ? null : activeFilter,
    );

    _isLoadingVouchers = false;
    result.when(
      onSuccess: (vouchers) => _myVouchers = vouchers,
      onFailure: (error) => _vouchersErrorMessage = error.replaceFirst('Exception: ', ''),
    );
    notifyListeners();
  }
}
