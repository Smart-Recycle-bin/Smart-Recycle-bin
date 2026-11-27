import '../../features/auth/data/models/user_model.dart';
import '../../features/map_bins/data/models/bin_model.dart';
import '../../features/scan_session/data/models/disposal_session_model.dart';
import '../../features/survey/data/models/survey_model.dart';
import '../../features/survey/data/models/survey_item_model.dart';
import 'package:ecobin/features/marketplace/data/models/catalog_item_model.dart';
import 'package:ecobin/features/marketplace/domain/entities/catalog_item_entity.dart';
import '../../features/wallet/data/models/ledger_entry_model.dart';

class MockData {
  MockData._();

  // 1. Current Mock User (Youssef Mohamed as shown on Profile Screen 14)
  static UserModel currentUser = const UserModel(
    userId: 'usr-b3f1',
    email: 'youssef@example.com',
    displayName: 'Youssef Mohamed',
    role: 'USER_CITIZEN',
    phoneNumber: '+201234567890',
    profilePhotoUrl: null,
    points: 1420,
  );

  // 2. Nearby Smart Bins (Matching Screen 6, optionally centered around real user GPS)
  static List<BinModel> getBins({double? centerLat, double? centerLng}) {
    final baseLat = centerLat ?? 30.0444;
    final baseLng = centerLng ?? 31.2357;

    return [
      BinModel(
        binId: 'bin-420',
        name: 'Bin#420',
        latitude: baseLat + 0.0012,
        longitude: baseLng + 0.0008,
        district: 'AUC Campus, Main Gate',
        status: 'AVAILABLE',
        fillLevel: 32,
        distanceMeters: 140,
        walkingMinutes: 2,
      ),
      BinModel(
        binId: 'bin-421',
        name: 'Bin#421',
        latitude: baseLat + 0.0032,
        longitude: baseLng + 0.0022,
        district: 'Downtown Square Hub',
        status: 'AVAILABLE',
        fillLevel: 45,
        distanceMeters: 380,
        walkingMinutes: 5,
      ),
      BinModel(
        binId: 'bin-422',
        name: 'Bin#422',
        latitude: baseLat + 0.0065,
        longitude: baseLng + 0.0050,
        district: 'Metro Station Entrance',
        status: 'UNAVAILABLE',
        fillLevel: 96,
        distanceMeters: 820,
        walkingMinutes: 12,
      ),
      BinModel(
        binId: 'bin-423',
        name: 'Bin#423',
        latitude: baseLat - 0.0040,
        longitude: baseLng - 0.0035,
        district: 'Public Library Avenue',
        status: 'AVAILABLE',
        fillLevel: 68,
        distanceMeters: 550,
        walkingMinutes: 8,
      ),
    ];
  }

  // 3. Active Disposal Session (Matching Screen 8)
  static DisposalSessionModel getActiveSession(String binId) => DisposalSessionModel(
        sessionId: 's-9021-active',
        binId: binId,
        binName: binId.contains('210') ? 'Bin#210' : 'Bin#420',
        status: 'active',
        totalPoints: 35,
        countdownSeconds: 90, // 1:30 Min
        items: const [
          DetectedItemModel(
            itemId: 'i-01',
            wasteType: 'PLASTIC',
            points: 10,
            imageUrl: 'https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300',
          ),
          DetectedItemModel(
            itemId: 'i-02',
            wasteType: 'PLASTIC',
            points: 10,
            imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300',
          ),
          DetectedItemModel(
            itemId: 'i-03',
            wasteType: 'PLASTIC',
            points: 10,
            imageUrl: 'https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300',
          ),
          DetectedItemModel(
            itemId: 'i-04',
            wasteType: 'TRASH',
            points: 5,
            imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=300',
          ),
        ],
      );

  // 4. Surveys List (Matching Screen 12 & Screen 11)
  static List<SurveyModel> getSurveys() => [
        const SurveyModel(
          surveyId: 'srv-2043',
          surveyNumber: 2043,
          sessionId: 's-9021',
          binId: 'bin-420',
          binName: 'Bin#420',
          status: 'waiting',
          points: 21,
          timeAgo: 'Today, 10:30 PM',
          items: [
            SurveyItemModel(
              itemId: 'i-01',
              detectedWasteType: 'Plastic',
              confirmedWasteType: 'Plastic',
              points: 5,
              imageUrl: 'https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300',
            ),
            SurveyItemModel(
              itemId: 'i-02',
              detectedWasteType: 'Metal',
              confirmedWasteType: 'Metal',
              points: 8,
              imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=300',
            ),
            SurveyItemModel(
              itemId: 'i-03',
              detectedWasteType: 'Organic',
              confirmedWasteType: 'Organic',
              points: 3,
              imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=300',
            ),
            SurveyItemModel(
              itemId: 'i-04',
              detectedWasteType: 'Plastic',
              confirmedWasteType: 'Plastic',
              points: 5,
              imageUrl: 'https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300',
            ),
          ],
        ),
        const SurveyModel(
          surveyId: 'srv-2041',
          surveyNumber: 2041,
          sessionId: 's-9018',
          binId: 'bin-420',
          binName: 'Bin#420',
          status: 'done',
          points: 30,
          timeAgo: 'Today, 01:23 PM',
        ),
        const SurveyModel(
          surveyId: 'srv-2034',
          surveyNumber: 2034,
          sessionId: 's-9005',
          binId: 'bin-418',
          binName: 'Bin#418',
          status: 'done',
          points: 10,
          timeAgo: 'Yesterday',
        ),
        const SurveyModel(
          surveyId: 'srv-2021',
          surveyNumber: 2021,
          sessionId: 's-8991',
          binId: 'bin-414',
          binName: 'Bin#414',
          status: 'waiting',
          points: 22,
          timeAgo: 'Mar 28',
        ),
        const SurveyModel(
          surveyId: 'srv-2014',
          surveyNumber: 2014,
          sessionId: 's-8980',
          binId: 'bin-420',
          binName: 'Bin#420',
          status: 'waiting',
          points: 28,
          timeAgo: 'Mar 28',
        ),
      ];

  // 5. Marketplace Rewards & Spotlight Banners (Matching Screens 9 & 10)
  static List<CatalogItemModel> getCatalog() => const [
        CatalogItemModel(
          itemId: 'cat-vodafone',
          brand: 'vodafone',
          title: 'Vodafone Internet E£ 5 Pounds',
          description: 'Instant mobile data recharge voucher for Vodafone Egypt.',
          logoUrl: 'assets/images/vodafone_logo.png',
          defaultPointsCost: 5000,
          denominations: [
            VoucherDenomination(valueEgp: 5, pointsCost: 5000),
            VoucherDenomination(valueEgp: 10, pointsCost: 10000),
          ],
        ),
        CatalogItemModel(
          itemId: 'cat-carrefour',
          brand: 'Carrefour',
          title: 'Carrefour Voucher E£ 10 Pounds',
          description: 'Turn your EcoBin points into a Carrefour voucher for groceries and everyday essentials.',
          logoUrl: 'assets/images/carrefour_logo.png',
          defaultPointsCost: 10000,
          denominations: [
            VoucherDenomination(valueEgp: 10, pointsCost: 1000),
            VoucherDenomination(valueEgp: 20, pointsCost: 2000),
            VoucherDenomination(valueEgp: 30, pointsCost: 3000),
          ],
        ),
        CatalogItemModel(
          itemId: 'cat-etisalat',
          brand: 'e&',
          title: 'e& Internet E£ 10 Pounds',
          description: 'High-speed internet recharge for e& Egypt mobile subscribers.',
          logoUrl: 'assets/images/etisalat_logo.png',
          defaultPointsCost: 10000,
          denominations: [
            VoucherDenomination(valueEgp: 10, pointsCost: 10000),
            VoucherDenomination(valueEgp: 20, pointsCost: 20000),
          ],
        ),
        CatalogItemModel(
          itemId: 'cat-metro',
          brand: 'Cairo Metro',
          title: 'Cairo Metro Ticket E£ 10 Pounds',
          description: 'Single-journey or multi-station pass on Cairo Metro lines.',
          logoUrl: 'assets/images/metro_logo.png',
          defaultPointsCost: 10000,
          denominations: [
            VoucherDenomination(valueEgp: 10, pointsCost: 10000),
          ],
        ),
      ];

  static List<SpotlightBannerEntity> getSpotlightBanners() => const [
        SpotlightBannerEntity(
          bannerId: 'b-metro-01',
          title: 'Metro Free Ticket\nOn Your Next Trip',
          subtitle: 'Enjoy a free Metro ride!\nClaim your free ticket on your next trip now.',
          imageUrl: 'assets/images/metro_spotlight.jpg',
          targetItemId: 'cat-metro',
        ),
      ];

  // 6. Wallet Activity / Ledger Entries (Matching Screen 13)
  static List<LedgerEntryModel> getLedger() => const [
        LedgerEntryModel(
          transactionId: 't-01',
          title: 'Recycle Survey Bonus',
          timeFormatted: 'Today, 10:30 PM',
          pointsDelta: 15,
          type: 'credit',
          source: 'session_confirm',
        ),
        LedgerEntryModel(
          transactionId: 't-02',
          title: 'Recycle Survey Bonus',
          timeFormatted: 'Today, 12:30 PM',
          pointsDelta: 50,
          type: 'credit',
          source: 'session_confirm',
        ),
        LedgerEntryModel(
          transactionId: 't-03',
          title: 'Recycle Survey Bonus',
          timeFormatted: 'Today, 01:23 PM',
          pointsDelta: 5,
          type: 'credit',
          source: 'session_confirm',
        ),
        LedgerEntryModel(
          transactionId: 't-04',
          title: 'Gift Redeem',
          timeFormatted: 'Yesterday',
          pointsDelta: -1200,
          type: 'debit',
          source: 'voucher_redemption',
        ),
        LedgerEntryModel(
          transactionId: 't-05',
          title: 'Recycle Survey Bonus',
          timeFormatted: 'Mar 28',
          pointsDelta: 150,
          type: 'credit',
          source: 'session_confirm',
        ),
        LedgerEntryModel(
          transactionId: 't-06',
          title: 'Gift Redeem',
          timeFormatted: 'Mar 24',
          pointsDelta: -500,
          type: 'debit',
          source: 'voucher_redemption',
        ),
      ];
}
