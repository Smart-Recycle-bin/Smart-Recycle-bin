import 'package:flutter/foundation.dart';
import '../../domain/entities/catalog_item_entity.dart';
import '../../domain/repositories/marketplace_repository.dart';

class MarketplaceViewModel extends ChangeNotifier {
  final MarketplaceRepository marketplaceRepository;

  MarketplaceViewModel({required this.marketplaceRepository});

  List<CatalogItemEntity> _items = [];
  List<SpotlightBannerEntity> _banners = [];
  int _balancePoints = 1420;
  bool _isLoading = false;
  String? _errorMessage;

  CatalogItemEntity? _selectedItem;
  VoucherDenomination? _selectedDenomination;

  List<CatalogItemEntity> get items => _items;
  List<SpotlightBannerEntity> get banners => _banners;
  int get balancePoints => _balancePoints;
  double get cashValueEgp => _balancePoints / 100.0;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  CatalogItemEntity? get selectedItem => _selectedItem;
  VoucherDenomination? get selectedDenomination => _selectedDenomination;

  int get balanceAfterRedemption {
    if (_selectedDenomination == null) return _balancePoints;
    return _balancePoints - _selectedDenomination!.pointsCost;
  }

  Future<void> init() async {
    await fetchMarketplaceData();
  }

  Future<void> fetchMarketplaceData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final catalogResult = await marketplaceRepository.getCatalog();
    final bannersResult = await marketplaceRepository.getSpotlightBanners();

    _isLoading = false;

    catalogResult.when(
      onSuccess: (data) => _items = data,
      onFailure: (error) => _errorMessage = error,
    );

    bannersResult.when(
      onSuccess: (data) => _banners = data,
      onFailure: (_) {},
    );

    notifyListeners();
  }

  void selectItemForRedemption(CatalogItemEntity item) {
    _selectedItem = item;
    if (item.denominations.isNotEmpty) {
      _selectedDenomination = item.denominations.first;
    }
    notifyListeners();
  }

  void selectDenomination(VoucherDenomination denomination) {
    _selectedDenomination = denomination;
    notifyListeners();
  }

  Future<String?> redeemSelected() async {
    if (_selectedItem == null || _selectedDenomination == null) return null;

    if (_balancePoints < _selectedDenomination!.pointsCost) {
      _errorMessage = 'Insufficient EcoPoints balance for this voucher';
      notifyListeners();
      return null;
    }

    _isLoading = true;
    notifyListeners();

    final result = await marketplaceRepository.redeemReward(
      itemId: _selectedItem!.itemId,
      denominationEgp: _selectedDenomination!.valueEgp,
      pointsCost: _selectedDenomination!.pointsCost,
    );

    _isLoading = false;

    return result.when(
      onSuccess: (voucherCode) {
        _balancePoints -= _selectedDenomination!.pointsCost;
        notifyListeners();
        return voucherCode;
      },
      onFailure: (error) {
        _errorMessage = error;
        notifyListeners();
        return null;
      },
    );
  }
}
