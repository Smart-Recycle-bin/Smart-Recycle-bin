# 📱 EcoBin Mobile Application
> **AI-Powered IoT Smart Recycling, Computer Vision Verification & Gamified Eco-Rewards**

[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-3.x-0175C2?logo=dart)](https://dart.dev)
[![Figma](https://img.shields.io/badge/Figma-Design%20Prototype-F24E1E?logo=figma)](https://www.figma.com/design/MZPYvOei74jV7NKwTf6vLO/Untitled?node-id=0-1&t=ABeZOigsrJWrVioC-1)
[![Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture%20%2B%20MVVM-blue.svg)](#)
[![UI Specification](https://img.shields.io/badge/UI%2FUX-EcoBinUI%20Mobile%20(14%20Screens)-brightgreen.svg)](https://github.com/Smart-Recycle-bin/Smart-Recycle-bin/blob/main/docs/EcoBinUI%20Mobile.pdf)

---

## 🎨 UI/UX Design Specification

The mobile application is crafted pixel-for-pixel according to the official **14-screen** design specification:

- 🎨 **Interactive Figma Prototype:** [EcoBin Mobile Interactive Figma Prototype](https://www.figma.com/design/MZPYvOei74jV7NKwTf6vLO/Untitled?node-id=0-1&t=ABeZOigsrJWrVioC-1)
- 📄 **Official Design PDF (Main Branch):** [EcoBinUI Mobile.pdf (Main Branch)](https://github.com/Smart-Recycle-bin/Smart-Recycle-bin/blob/main/docs/EcoBinUI%20Mobile.pdf)
- 📂 **Local Repository Path:** [`docs/EcoBinUI Mobile.pdf`](../../docs/EcoBinUI%20Mobile.pdf)

### 📱 Implemented UI Screen Flow (14 Screens)
1. **Brand System & Typography Guide:** Cairo (`Cairo`) & IBM Plex Sans (`IBMPlexSans`), `#10B981` (Primary Green), `#064E3B` (Deep Forest), `#34D399` (Mint Green), and `#1E293B` (Dark Slate).
2. **Login View (`/login`):** Unified authentication entry point with email and password inputs.
3. **Register / Sign Up View (`/register`):** Citizen account self-registration.
4. **Forgot Password View (`/forgot-password`):** Password reset request via registered email.
5. **Verify Email View (`/verify-email`):** 4-digit OTP email validation flow.
6. **Smart Bins Map & Geolocation (`/map`):** Fullscreen interactive OpenStreetMap with live GPS positioning, nearest bin status cards, walking polyline routes, search bar, and external Google Maps turn-by-turn navigation.
7. **Active Surveys List (`/surveys`):** Listing completed and awaiting verification surveys.
8. **AI Waste Verification Survey (`/verify-survey`):** Multi-item visual classification survey with points reward tally and AI correctness feedback.
9. **EcoBin Marketplace (`/marketplace`):** Digital rewards catalog with featured spotlight promotions and partner vouchers (Vodafone, Carrefour, e&, Cairo Metro).
10. **Reward Details & Point Redemption (`/reward-details`):** Interactive voucher denomination selector (E£ 10, E£ 20, E£ 30) with real-time balance calculations.
11. **Active QR Disposal Session (`/active-session`):** 60-second renewed countdown timer, real-time waste items list, and finish session triggers.
12. **Eco-Wallet & Financial Ledger (`/wallet`):** Total earned points, cash equivalent (EGP), and append-only ledger transaction history.
13. **Support & Inquiries (`/support`):** Category-based customer support ticket submission.
14. **User Profile & Account Settings (`/profile`):** Account overview, personal info updates, legal agreements, and logout with full bottom navigation bar integration.

---

## 🏗️ Architecture & Engineering Principles

EcoBin Mobile is structured using **Clean Architecture + MVVM** (Model-View-ViewModel):

```
lib/
├── core/                        # Cross-cutting utilities, theme, and network
│   ├── config/                  # App environment and mock toggles
│   ├── constants/               # Colors, typography, API endpoints
│   ├── mock/                    # Offline mock dataset matching PDF spec
│   ├── network/                 # Dio HTTP client and interceptors
│   ├── storage/                 # Encrypted token & session persistence
│   └── utils/                   # Result monads and helper extensions
├── features/                    # Feature modules (Domain-Driven Design)
│   ├── auth/                    # Login, Register, OTP verification
│   ├── map_bins/                # GPS tracking, OpenStreetMap, nearest bins
│   ├── scan_session/            # Camera QR scanner & active bin session
│   ├── survey/                  # AI waste classification validation
│   ├── marketplace/             # Partner reward vouchers & redemption
│   ├── wallet/                  # Append-only transaction ledger
│   ├── profile/                 # Profile management and support tickets
│   └── shell/                   # Main scaffold & floating bottom navigation bar
└── main.dart                    # Application bootstrap & dependency injection
```

---

## 🚀 Getting Started

### Prerequisites
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (`^3.12` or higher)
- [Android SDK / Android Studio](https://developer.android.com/studio) (Target SDK 34)
- A connected physical Android device or emulator with Location & Camera permissions enabled

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Smart-Recycle-bin/Smart-Recycle-bin.git
   cd Smart-Recycle-bin/src/mobile
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run code analysis:**
   ```bash
   flutter analyze
   ```

4. **Execute automated tests:**
   ```bash
   flutter test
   ```

5. **Launch on device:**
   ```bash
   flutter run
   ```

6. **Build release/debug APK:**
   ```bash
   flutter build apk --split-per-abi --debug
   ```
