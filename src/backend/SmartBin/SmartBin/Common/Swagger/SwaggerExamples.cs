namespace SmartBin.Common.Swagger
{
    /// <summary>
    /// Centralized JSON response examples for all Swagger/OpenAPI endpoints.
    /// </summary>
    public static class SwaggerExamples
    {
        // ── Shared Error Envelopes ──────────────────────────────────────────────

        public const string ValidationError = """
        {
          "success": false,
          "error": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid request data.",
            "details": [
              {
                "field": "fieldName",
                "message": "Value is invalid or missing."
              }
            ]
          }
        }
        """;

        public const string Unauthorized = """
        {
          "success": false,
          "error": {
            "code": "UNAUTHORIZED",
            "message": "Access token is missing or invalid."
          }
        }
        """;

        public const string Forbidden = """
        {
          "success": false,
          "error": {
            "code": "FORBIDDEN",
            "message": "You do not have permission to access this resource."
          }
        }
        """;

        public const string NotFound = """
        {
          "success": false,
          "error": {
            "code": "NOT_FOUND",
            "message": "Requested resource was not found."
          }
        }
        """;

        public const string Conflict = """
        {
          "success": false,
          "error": {
            "code": "CONFLICT",
            "message": "The request conflicts with the current resource state."
          }
        }
        """;

        public const string ServerError = """
        {
          "success": false,
          "error": {
            "code": "SERVER_ERROR",
            "message": "An unexpected error occurred while processing your request."
          }
        }
        """;

        // ── Auth ────────────────────────────────────────────────────────────────

        public const string AuthLoginSuccess = """
        {
          "success": true,
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "expiresIn": 900,
            "refreshToken": "dGhpcy1pcy1hLXNhbXBsZS1yZWZyZXNoLXRva2Vu",
            "user": {
              "userId": 4,
              "email": "",
              "displayName": "Youssef Mohamed",
              "role": "USER_CITIZEN",
              "phoneNumber": null,
              "profilePhotoUrl": null,
              "points": 0
            }
          }
        }
        """;

        public const string AuthLoginUnauthorized = """
        {
          "success": false,
          "error": {
            "code": "INVALID_CREDENTIALS",
            "message": "Invalid email or password."
          }
        }
        """;

        public const string AuthLoginForbidden = """
        {
          "success": false,
          "error": {
            "code": "EMAIL_NOT_VERIFIED",
            "message": "Please verify your email first."
          }
        }
        """;

        public const string AuthRegisterSuccess = """
        {
          "success": true,
          "data": {
            "userId": 12,
            "email": "citizen@ecobin.com",
            "displayName": "Youssef Mohamed",
            "role": "USER_CITIZEN",
            "isVerified": false,
            "createdAt": "2026-11-25T15:00:00Z",
            "points": 0
          }
        }
        """;

        public const string AuthRegisterConflict = """
        {
          "success": false,
          "error": {
            "code": "EMAIL_ALREADY_EXISTS",
            "message": "An account with this email already exists."
          }
        }
        """;

        public const string AuthVerifyEmailSuccess = """
        {
          "success": true,
          "data": {
            "message": "Email verified successfully. You can now log in.",
            "isVerified": true
          }
        }
        """;

        public const string AuthInvalidOtp = """
        {
          "success": false,
          "error": {
            "code": "INVALID_OR_EXPIRED_OTP",
            "message": "The code is incorrect or has expired."
          }
        }
        """;

        public const string AuthTooManyAttempts = """
        {
          "success": false,
          "error": {
            "code": "TOO_MANY_ATTEMPTS",
            "message": "Too many incorrect attempts. Request a new code."
          }
        }
        """;

        public const string AuthResendOtpSuccess = """
        {
          "success": true,
          "data": {
            "message": "If the account exists and is not verified, a new code has been sent."
          }
        }
        """;

        public const string AuthTooManyRequests = """
        {
          "success": false,
          "error": {
            "code": "TOO_MANY_REQUESTS",
            "message": "Please wait 60 seconds before requesting another code."
          }
        }
        """;

        public const string AuthLogoutSuccess = """
        {
          "success": true,
          "data": {
            "message": "Logged out successfully"
          }
        }
        """;

        public const string AuthRefreshSuccess = """
        {
          "success": true,
          "data": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            "expiresIn": 900,
            "refreshToken": "bmV3LXNhbXBsZS1yZWZyZXNoLXRva2Vu"
          }
        }
        """;

        public const string AuthRefreshUnauthorized = """
        {
          "success": false,
          "error": {
            "code": "INVALID_REFRESH_TOKEN",
            "message": "The refresh token is invalid, expired or already used."
          }
        }
        """;

        public const string AuthForgotPasswordSuccess = """
        {
          "success": true,
          "data": {
            "message": "If this email exists, a verification code has been sent."
          }
        }
        """;

        public const string AuthVerifyResetOtpSuccess = """
        {
          "success": true,
          "data": {
            "verified": true,
            "message": "OTP verified successfully."
          }
        }
        """;

        public const string AuthResetPasswordSuccess = """
        {
          "success": true,
          "data": {
            "message": "Password has been reset successfully. Please log in again."
          }
        }
        """;

        // ── Profile ─────────────────────────────────────────────────────────────

        public const string ProfileGetSuccess = """
        {
          "success": true,
          "data": {
            "userId": 4,
            "email": "citizen@ecobin.com",
            "displayName": "Youssef Mohamed",
            "phoneNumber": "+20 100 123 4567",
            "profilePhotoUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/profiles/4.jpg",
            "role": "USER_CITIZEN",
            "points": 1420
          }
        }
        """;

        public const string ProfileUpdateSuccess = """
        {
          "success": true,
          "data": {
            "userId": 4,
            "displayName": "Youssef Mohamed",
            "phoneNumber": "+201001234567",
            "profilePhotoUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/profiles/4.jpg"
          }
        }
        """;

        public const string ProfileNotFound = """
        {
          "success": false,
          "error": {
            "code": "USER_NOT_FOUND",
            "message": "User account was not found."
          }
        }
        """;

        public const string PayloadTooLarge = """
        {
          "success": false,
          "error": {
            "code": "PAYLOAD_TOO_LARGE",
            "message": "File size exceeds the allowed limit (5MB)."
          }
        }
        """;

        public const string UnsupportedMediaType = """
        {
          "success": false,
          "error": {
            "code": "UNSUPPORTED_MEDIA_TYPE",
            "message": "Only JPEG, PNG and WEBP images are accepted."
          }
        }
        """;

        // ── Catalog (Citizen) ───────────────────────────────────────────────────

        public const string CatalogListSuccess = """
        {
          "success": true,
          "data": [
            {
              "itemId": 1,
              "categoryId": 1,
              "brand": "Telecom",
              "title": "Vodafone Internet E£ 5 Pounds",
              "logoUrl": "assets/images/vodafone_logo.png",
              "startingPointsCost": 500,
              "optionsCount": 2,
              "status": "in_stock"
            }
          ],
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 3,
            "totalPages": 1
          }
        }
        """;

        public const string CatalogFeaturedSuccess = """
        {
          "success": true,
          "data": [
            {
              "bannerId": "b1",
              "title": "Metro Free Ticket On Your Next Trip",
              "subtitle": "Enjoy a free Metro ride! Claim your free ticket on your next trip now.",
              "imageUrl": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600",
              "targetItemId": "1"
            }
          ]
        }
        """;

        public const string CatalogItemDetailsSuccess = """
        {
          "success": true,
          "data": {
            "itemId": 1,
            "categoryId": 1,
            "brand": "Telecom",
            "title": "Vodafone Internet E£ 5 Pounds",
            "description": "Get 500MB high-speed internet voucher redeemable via Vodafone app.",
            "logoUrl": "assets/images/vodafone_logo.png",
            "pointsCost": 500,
            "inStock": true,
            "validUntil": "2027-11-24T06:44:49Z",
            "options": [
              {
                "itemId": 1,
                "title": "Vodafone Internet E£ 5 Pounds",
                "pointsCost": 500,
                "inStock": true
              }
            ]
          }
        }
        """;

        public const string CatalogRedeemSuccess = """
        {
          "success": true,
          "data": {
            "redemptionId": 12,
            "itemId": 1,
            "voucherId": 12,
            "voucherCode": "TEL-A1B2-3456",
            "pointsSpent": 500,
            "valueEgpAtRedemption": 5.00,
            "newAvailablePoints": 920
          }
        }
        """;

        public const string CatalogRedeemBadRequest = """
        {
          "success": false,
          "error": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid denomination. Supported values are 10, 20, or 50 EGP.",
            "details": [
              {
                "field": "denominationEgp",
                "message": "denominationEgp must be 10, 20, or 50."
              }
            ]
          }
        }
        """;

        public const string CatalogRedeemConflict = """
        {
          "success": false,
          "error": {
            "code": "INSUFFICIENT_POINTS",
            "message": "Insufficient available points for this redemption."
          }
        }
        """;

        // ── Admin Catalog ───────────────────────────────────────────────────────

        public const string AdminCatalogListSuccess = """
        {
          "success": true,
          "data": [
            {
              "itemId": 1,
              "title": "Carrefour Voucher E£ 10 Pounds",
              "description": "Digital shopping voucher valid at all Carrefour stores across Egypt.",
              "categoryId": 2,
              "categoryName": "Supermarket",
              "voucherCodeType": "Promo Code",
              "pointsCost": 1000,
              "stock": 50,
              "redemptionsCount": 0,
              "status": "in_stock",
              "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/rewards/carrefour.png",
              "validFrom": "2026-11-24T06:44:49Z",
              "validUntil": "2027-11-24T06:44:49Z"
            }
          ],
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 3,
            "totalPages": 1
          }
        }
        """;

        public const string AdminCatalogItemSuccess = """
        {
          "success": true,
          "data": {
            "itemId": 1,
            "title": "Carrefour Voucher E£ 10 Pounds",
            "description": "Digital shopping voucher valid at all Carrefour stores across Egypt.",
            "categoryId": 2,
            "categoryName": "Supermarket",
            "voucherCodeType": "Promo Code",
            "pointsCost": 1000,
            "stock": 50,
            "redemptionsCount": 0,
            "status": "in_stock",
            "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/rewards/carrefour.png",
            "validFrom": "2026-11-24T06:44:49Z",
            "validUntil": "2027-11-24T06:44:49Z"
          }
        }
        """;

        public const string AdminCategoriesListSuccess = """
        {
          "success": true,
          "data": [
            {
              "categoryId": 1,
              "name": "Telecom",
              "status": "active",
              "logoUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/categories/telecom.png"
            }
          ]
        }
        """;

        public const string AdminCategorySuccess = """
        {
          "success": true,
          "data": {
            "categoryId": 1,
            "name": "Telecom",
            "status": "active",
            "logoUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/categories/telecom.png"
          }
        }
        """;

        public const string AdminCategoryArchiveSuccess = """
        {
          "success": true,
          "data": {
            "categoryId": 1,
            "status": "archived",
            "archivedAt": "2026-11-25T15:00:00Z"
          }
        }
        """;

        public const string AdminCategoryUnarchiveSuccess = """
        {
          "success": true,
          "data": {
            "categoryId": 1,
            "status": "active"
          }
        }
        """;

        public const string AdminUploadImageSuccess = """
        {
          "success": true,
          "data": {
            "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/rewards/sample.png"
          }
        }
        """;

        public const string AdminItemArchiveSuccess = """
        {
          "success": true,
          "data": {
            "itemId": 1,
            "status": "archived"
          }
        }
        """;

        public const string AdminItemUnarchiveSuccess = """
        {
          "success": true,
          "data": {
            "itemId": 1,
            "status": "active"
          }
        }
        """;

        // ── Bins (Citizen & Admin) ──────────────────────────────────────────────

        public const string BinsNearbySuccess = """
        {
          "success": true,
          "data": [
            {
              "binId": 1,
              "name": "Bin#001",
              "latitude": 30.0444,
              "longitude": 31.2357,
              "status": "Available",
              "fillLevel": 12.0,
              "district": "Downtown Cairo",
              "distanceMeters": 140,
              "walkingTimeMinutes": 2
            }
          ]
        }
        """;

        public const string BinsSearchSuccess = """
        {
          "success": true,
          "data": [
            {
              "binId": 1,
              "name": "Bin#001",
              "latitude": 30.0444,
              "longitude": 31.2357,
              "district": "Downtown Cairo",
              "status": "Available",
              "fillLevel": 12.0,
              "distanceMeters": 140,
              "walkingTimeMinutes": 2
            }
          ]
        }
        """;

        public const string BinDetailsSuccess = """
        {
          "success": true,
          "data": {
            "binId": 1,
            "name": "Bin#001",
            "latitude": 30.0444,
            "longitude": 31.2357,
            "status": "Available",
            "fillLevel": 12.0,
            "district": "Downtown Cairo",
            "assignedCollectorId": null,
            "predictedFullAt": null
          }
        }
        """;

        public const string AdminBinsListSuccess = """
        {
          "success": true,
          "data": [
            {
              "binId": 1,
              "name": "Bin#001",
              "area": "Downtown Cairo",
              "district": "Downtown Cairo",
              "region": "Downtown Cairo",
              "latitude": 30.0444,
              "longitude": 31.2357,
              "fillLevel": 12.0,
              "status": "AVAILABLE",
              "collectorId": 3,
              "collectorName": "EcoBin Collector",
              "lastServicedAt": "2026-11-24T10:30:00Z"
            }
          ],
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 3,
            "totalPages": 1
          },
          "summary": {
            "labelledImages": 120,
            "pendingReviews": 4,
            "reviewedReports": 18,
            "imagesUntilNextRetraining": 80,
            "nextRetrainingThreshold": 200
          }
        }
        """;

        public const string AdminRegisterBinSuccess = """
        {
          "success": true,
          "data": {
            "binId": 4,
            "deviceSerial": "BIN-E2E-999",
            "status": "AVAILABLE",
            "fillLevel": 0.0
          }
        }
        """;

        public const string AdminRegisterBinConflict = """
        {
          "success": false,
          "error": {
            "code": "DEVICE_ALREADY_REGISTERED",
            "message": "This device serial is already registered."
          }
        }
        """;

        public const string AdminUpdateBinSuccess = """
        {
          "success": true,
          "data": {
            "binId": 1,
            "latitude": 30.0444,
            "longitude": 31.2357,
            "district": "Downtown Cairo",
            "capacityThresholdKg": 50.0
          }
        }
        """;

        // ── Sessions & Ingestion ────────────────────────────────────────────────

        public const string StartSessionSuccess = """
        {
          "success": true,
          "data": {
            "sessionId": 42,
            "binId": 1,
            "binName": "Bin#001",
            "status": "active",
            "windowExpiresAt": "2026-11-25T15:01:00Z",
            "countdownSeconds": 60,
            "totalPoints": 0,
            "items": []
          }
        }
        """;

        public const string StartSessionConflict = """
        {
          "success": false,
          "error": {
            "code": "BIN_UNSERVICEABLE",
            "message": "This bin is full or offline and cannot accept new sessions."
          }
        }
        """;

        public const string SessionStatusSuccess = """
        {
          "success": true,
          "data": {
            "sessionId": 42,
            "binId": 1,
            "binName": "Bin#001",
            "status": "active",
            "surveyId": null,
            "windowExpiresAt": "2026-11-25T15:01:00Z",
            "countdownSeconds": 45,
            "totalPoints": 35,
            "items": [
              {
                "itemId": 101,
                "wasteType": "PLASTIC",
                "estimatedPoints": 15,
                "points": 15,
                "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/recycled-items/item101.jpg"
              }
            ]
          }
        }
        """;

        public const string EndSessionSuccess = """
        {
          "success": true,
          "data": {
            "sessionId": 42,
            "binId": 1,
            "binName": "Bin#001",
            "status": "terminated",
            "terminationReason": "manual",
            "surveyId": 18,
            "countdownSeconds": 0,
            "totalPoints": 35,
            "items": [
              {
                "itemId": 101,
                "wasteType": "PLASTIC",
                "estimatedPoints": 15,
                "points": 15,
                "imageUrl": null
              }
            ]
          }
        }
        """;

        public const string SessionNotActiveConflict = """
        {
          "success": false,
          "error": {
            "code": "SESSION_NOT_ACTIVE",
            "message": "The session has already ended."
          }
        }
        """;

        public const string IngestItemSuccess = """
        {
          "success": true,
          "data": {
            "itemId": 101,
            "sessionId": 42,
            "binId": 1,
            "userId": 4,
            "wasteType": "PLASTIC",
            "predictedLabel": "plastic",
            "angle": 216,
            "confidenceScore": 0.94,
            "estimatedPoints": 15,
            "windowExpiresAt": "2026-11-25T15:02:00Z"
          }
        }
        """;

        // ── Surveys ─────────────────────────────────────────────────────────────

        public const string GetSessionSurveySuccess = """
        {
          "success": true,
          "data": {
            "surveyId": 18,
            "sessionId": 42,
            "status": "waiting",
            "items": [
              {
                "itemId": 101,
                "wasteType": "PLASTIC",
                "estimatedPoints": 15,
                "points": 15,
                "imageUrl": null
              }
            ],
            "totalPoints": 15
          }
        }
        """;

        public const string ConfirmSurveySuccess = """
        {
          "success": true,
          "data": {
            "sessionId": 42,
            "surveyStatus": "done",
            "outcome": "confirmed",
            "pointsStatus": "awarded",
            "pointsAwarded": 15,
            "newAvailablePoints": 1435,
            "newLifetimePoints": 3135
          }
        }
        """;

        public const string SurveyConflict = """
        {
          "success": false,
          "error": {
            "code": "SURVEY_ALREADY_RESOLVED",
            "message": "This survey has already been submitted."
          }
        }
        """;

        public const string GetMySurveysSuccess = """
        {
          "success": true,
          "data": {
            "surveys": [
              {
                "surveyId": 18,
                "surveyNumber": 1,
                "sessionId": 42,
                "binId": 1,
                "binName": "Bin#001",
                "status": "done",
                "outcome": "confirmed",
                "pointsStatus": "awarded",
                "estimatedPoints": 15,
                "points": 15,
                "pointsAwarded": 15,
                "createdAt": "2026-11-25T14:30:00Z",
                "timeAgo": "30 min ago",
                "items": [
                  {
                    "itemId": 101,
                    "detectedWasteType": "PLASTIC",
                    "confirmedWasteType": "PLASTIC",
                    "points": 15,
                    "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/recycled-items/item101.jpg",
                    "isCorrected": false
                  }
                ]
              }
            ],
            "meta": {
              "page": 1,
              "pageSize": 10,
              "totalItems": 1,
              "totalPages": 1,
              "pendingPoints": 0
            }
          },
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 1,
            "totalPages": 1,
            "pendingPoints": 0
          }
        }
        """;

        public const string SubmitSurveyCorrectionsSuccess = """
        {
          "success": true,
          "data": {
            "surveyId": 18,
            "sessionId": 42,
            "surveyStatus": "done",
            "outcome": "correction_submitted",
            "pointsStatus": "pending",
            "pointsAwarded": null,
            "totalPointsAwarded": 0,
            "flaggedReportIds": [ 7 ]
          }
        }
        """;

        public const string GetSurveyDetailsSuccess = """
        {
          "success": true,
          "data": {
            "surveyId": 18,
            "surveyNumber": 1,
            "sessionId": 42,
            "binId": 1,
            "binName": "Bin#001",
            "status": "waiting",
            "points": 35,
            "timeAgo": "Just now",
            "items": [
              {
                "itemId": 101,
                "detectedWasteType": "PLASTIC",
                "confirmedWasteType": "PLASTIC",
                "points": 15,
                "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/recycled-items/item101.jpg",
                "isCorrected": false
              }
            ]
          }
        }
        """;

        // ── Wallet ──────────────────────────────────────────────────────────────

        public const string WalletBalanceSuccess = """
        {
          "success": true,
          "data": {
            "availablePoints": 1420,
            "lifetimeEarnedPoints": 3120
          }
        }
        """;

        public const string WalletLedgerSuccess = """
        {
          "success": true,
          "data": [
            {
              "transactionId": 105,
              "timestamp": "2026-11-25T14:00:00Z",
              "timeFormatted": "Nov 25, 2:00 PM",
              "binId": 1,
              "entryType": "credit",
              "type": "credit",
              "title": "Recycle Survey Bonus",
              "pointsDelta": 50,
              "balanceAfter": 1420,
              "source": "session_award",
              "sourceId": 42
            },
            {
              "transactionId": 104,
              "timestamp": "2026-11-24T18:15:00Z",
              "timeFormatted": "Nov 24, 6:15 PM",
              "binId": null,
              "entryType": "debit",
              "type": "debit",
              "title": "Gift Redeem",
              "pointsDelta": -500,
              "balanceAfter": 1370,
              "source": "voucher_redemption",
              "sourceId": 1
            }
          ],
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 2,
            "totalPages": 1
          }
        }
        """;

        // ── Support Tickets ─────────────────────────────────────────────────────

        public const string SupportSubmitTicketSuccess = """
        {
          "success": true,
          "data": {
            "ticketId": "TICK-8F3A9C12",
            "category": "bin_issue",
            "description": "Bin lid did not open after scanning QR code.",
            "sessionId": null,
            "status": "open",
            "createdAt": "2026-11-25T15:00:00Z"
          }
        }
        """;

        public const string SupportGetTicketsSuccess = """
        {
          "success": true,
          "data": [
            {
              "ticketId": "TICK-8F3A9C12",
              "category": "bin_issue",
              "description": "Bin lid did not open after scanning QR code.",
              "sessionId": null,
              "status": "open",
              "createdAt": "2026-11-25T15:00:00Z"
            }
          ]
        }
        """;

        public const string SupportSubmitTicketBadRequest = """
        {
          "success": false,
          "error": {
            "code": "VALIDATION_ERROR",
            "message": "Description is required."
          }
        }
        """;

        // ── Vouchers ────────────────────────────────────────────────────────────

        public const string VouchersListSuccess = """
        {
          "success": true,
          "data": [
            {
              "voucherId": 12,
              "redemptionId": 12,
              "itemTitle": "Vodafone Internet E£ 5 Pounds",
              "pointsSpent": 500,
              "valueEgpAtRedemption": 5.00,
              "voucherCode": "TEL-A1B2-3456",
              "qrImageUrl": "https://api.ecobin.app/vouchers/12.png",
              "redeemedAt": "2026-11-26T14:00:00Z",
              "status": "unused"
            }
          ],
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 1,
            "totalPages": 1
          }
        }
        """;

        // ── Admin Inspections ───────────────────────────────────────────────────

        public const string AdminInspectionsListSuccess = """
        {
          "success": true,
          "data": [
            {
              "reportId": 7,
              "sessionId": 42,
              "binId": 1,
              "binName": "Bin#1",
              "imageThumbnailUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/recycled-items/item101.jpg",
              "mlPredictedWasteType": "PLASTIC",
              "mlConfidence": 0.72,
              "userFeedback": "User corrected classification from PLASTIC to METAL (AI rating: 3/5).",
              "createdAt": "2026-11-26T12:15:00Z",
              "reviewDecision": "PENDING",
              "retrainingStatus": "NOT_SENT"
            }
          ],
          "summary": {
            "labelledImages": 14,
            "pendingReviews": 3,
            "reviewedReports": 11,
            "imagesUntilNextRetraining": 36,
            "nextRetrainingThreshold": 50
          },
          "meta": {
            "page": 1,
            "pageSize": 10,
            "totalItems": 1,
            "totalPages": 1
          }
        }
        """;

        public const string AdminInspectionDetailSuccess = """
        {
          "success": true,
          "data": {
            "reportId": 7,
            "sessionId": 42,
            "binId": 1,
            "recyclerId": 1,
            "recyclerName": "Youssef Mohamed",
            "userFeedback": "User corrected classification from PLASTIC to METAL (AI rating: 3/5).",
            "mlPredictedWasteType": "PLASTIC",
            "estimatedPoints": 15,
            "imageUrl": "https://pub-7763b4f2d2cb4f75b4075c2a0c428ef2.r2.dev/recycled-items/item101.jpg",
            "reviewDecision": "PENDING",
            "retrainingStatus": "NOT_SENT",
            "createdAt": "2026-11-26T12:15:00Z"
          }
        }
        """;

        public const string AdminInspectionResolveSuccess = """
        {
          "success": true,
          "data": {
            "reportId": 7,
            "reviewDecision": "CORRECTED",
            "confirmedWasteType": "METAL",
            "sessionPointsFinalized": true,
            "pointsAwarded": 25,
            "transactionId": 106
          }
        }
        """;

        public const string AdminInspectionRetrainSuccess = """
        {
          "success": true,
          "data": {
            "reportId": 7,
            "retrainingStatus": "SENT"
          }
        }
        """;
    }
}
