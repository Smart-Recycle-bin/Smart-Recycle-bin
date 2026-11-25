# **Functional Requirements Document (FRD) — Smart Waste Bin System**

**Document Version:** 2.0  
**Status:** Approved for MVP  
**Last Updated:** September 21, 2026

# **1\. Overview & Scope**

This document specifies the complete Functional Requirements for the Smart Waste Bin System, encompassing the Mobile Application (used by Recyclers and Collectors) and the Web Admin Dashboard (used by System Administrators).

## **System Scope & Roles**

1. **Recycler / Citizen:** Uses the single mobile application to scan bins, dispose of recyclable waste during timed session windows, respond to post-disposal surveys, earn reward points, track their append-only wallet ledger, participate in gamification leaderboards, and redeem vouchers in the marketplace.  
2. **Collector / Bin Operator (Included in MVP):** Uses the **same mobile application** (with role-based authentication and routing). Monitors assigned bins, views live fill-levels and fill-time predictions, receives overflow alerts, and marks bins as serviced/emptied.  
3. **System Administrator (SYS\_ADMIN):** Uses the Web Admin Dashboard for fleet management, user moderation, rewards catalog administration, operational analytics, and audit logging. **The SYS\_ADMIN is the sole authority permitted to create and provision Collector accounts**.

# **2\. System Functional Modules**

## **Module 1: Authentication & Identity Management (AUTH / IAM)**

* ****AUTH-001 (Recycler Self-Registration):**** The system MUST allow new Recyclers to register an account directly from the mobile app using Email and Password. **(Third-party OAuth providers such as Google/Apple Sign-In are excluded)**.

* ****AUTH-002 (Collector Account Provisioning):**** The system MUST NOT allow self-registration for Collector accounts. Collector accounts MUST be created, provisioned, and assigned exclusively by the System Administrator (SYS\_ADMIN) through the Web Admin Dashboard.

* ****AUTH-003 (Shared Mobile Login):**** The mobile application MUST provide a single, unified login screen used by both Recycler and Collector accounts.

* ****AUTH-004 (Secure Token Authentication):**** The system MUST authenticate users securely and issue JWT-based access tokens containing user identification, role, and permission scope.

* ****AUTH-005 (Role-Based Routing):**** Upon successful authentication, the mobile app MUST route the user to their respective dashboard (Recycler Dashboard or Collector Dashboard) based on the role encoded in the JWT token.

* ****AUTH-006 (Password Recovery & Management):**** The system MUST support a complete password recovery flow (Forgot / Reset Password) via email verification tokens, as well as password updates from the user profile.

* ****PROFILE-001 (Profile Management):**** The system MUST allow authenticated users to view and update editable personal profile fields (display name, phone number, profile photo).

* ****IAM-001 (Account Deletion & Anonymization):**** When a Recycler requests account deletion via the mobile app, the system MUST anonymize user-identifying data in historical transactions and financial ledgers rather than performing physical hard deletes.

* ****IAM-002 (User Moderation & Account Suspension):**** The system MUST allow Admins to search users, inspect disposal logs, and suspend or ban accounts exhibiting fraudulent behavior. Blocked accounts MUST be prevented from claiming points or redeeming vouchers.

## **Module 2: QR Scanning & Disposal Cycle (TRX / AIE)**

* ****TRX-001 (QR Code Session Start):**** The mobile app MUST allow a Recycler to scan the dynamic or static QR code on a smart bin to initiate a disposal session.

* ****TRX-002 (Session Opening & Window Timer):**** Upon a valid QR scan, the bin lid MUST unlock and the system MUST start a ****60-second timed window**** for waste disposal.

* ****AIE-001 (AI Image Capture & Classification):**** When an item is thrown into the bin, the embedded camera MUST capture images, and the ML engine MUST classify the waste category (`WasteType`) and calculate estimated base reward points.

* ****TRX-003 (Timer Renewal Loop):**** For each item thrown and detected within the 60-second window, the system MUST ****automatically reset the 60-second timer****, allowing the user to dispose of additional items sequentially.

* ****TRX-004 (Session Termination Rules):**** The system MUST automatically terminate the active disposal session and lock the bin lid upon the occurrence of ANY of the following three conditions:

  1. ****Timeout:**** The 60-second window elapses without any new item being thrown.

  2. ****Concurrent Scan Interruption:**** A second user scans the bin's QR code while a session is active. In this case, the system MUST immediately terminate the first user's session, redirect them to their session survey, and open a new session for the second user.

## **Module 3: Post-Disposal Survey & Point Awarding (SURV)**

* ****SURV-001 (Session Summary Survey):**** Immediately after session termination (via any of the three termination conditions), the mobile app MUST present the Recycler with a summary survey listing detected items, classified categories, and total calculated points.

* ****SURV-002 (Confirmation & Point Credit):**** If the Recycler confirms the survey summary ("Confirm"), the system MUST execute an atomic transaction to immediately credit the calculated reward points to the user's Available points balance.

* ****SURV-003 (Rejection & Admin Active Learning Flagging):****
  * If the Recycler rejects or disputes the survey summary ("Reject"), the system MUST award ****0 points**** for that session.
  * The system MUST automatically generate a flagged inspection report containing the captured images, ML inference outputs, and user rejection feedback, and send it to the Admin Review Queue for AI model retraining (Active Learning Pipeline).

## **Module 4: Wallet, Financial Ledger & Gamification (WLET)**

* ****WLET-001 (Append-Only Financial Ledger):**** The system MUST maintain an immutable, append-only financial ledger recording transaction UUID, timestamp, bin identifier, item breakdown, points delta, and running balance snapshot for every point addition, deduction, or adjustment.

* ****WLET-002 (Dual-Bucket Wallet Balance):**** The system MUST display user points partitioned into two distinct balances: `Available Points` (ready for redemption) and `Lifetime Earned Points` (total historical points earned).

* ****WLET-003 (Manual Ledger Adjustments):**** The system MUST allow Admins to perform manual ledger credits or debits, strictly requiring an explicit, non-empty justification reason code that is logged in the audit trail.

* ****WLET-004 (Gamification & Leaderboards):**** The system MUST compile dynamic leaderboards (weekly, monthly, all-time) and assign milestone achievement badges based on lifetime earned points and total recycling volume.


## **Module 5: Rewards Marketplace (RWRD / MKT)**

* ****RWRD-001 (Catalog Administration & Auto-Depletion):**** The system MUST allow Admins to create, edit, price, and archive reward catalog items. Items MUST automatically transition to out-of-stock when inventory reaches zero.

* ****RWRD-002 (Catalog Browsing & Affordability Filtering):**** The mobile app MUST display an active rewards catalog, allowing Recyclers to browse and filter items by category and affordability based on their `Available Points` balance.

* ****RWRD-003 (Immediate Point Deduction):**** Upon confirmation of voucher redemption, the system MUST immediately deduct the voucher point cost from the user's `Available Points` and write a debit record to the append-only ledger.

* ****RWRD-004 (Digital Voucher Issuance):**** The system MUST generate a digital voucher containing a displayable code/barcode/QR code and store it in the user's "My Vouchers" wallet repository.


## **Module 6: Fleet Management & Collector Operations (FLT / COLDASH / BINMAP)**

* ****FLT-001 (Device Registration & Geolocation):**** The Web Admin Dashboard MUST allow Admins to register bins, edit location coordinates, capacity thresholds, and district assignments.

* ****FLT-002 (Operational Telemetry & Fill Levels):**** The system MUST track live fill levels and operational states (`AVAILABLE`, `≥80% FULL`, `≥95% FULL / NEEDS SERVICING`).

* ****BINMAP-001 (Public Recycler Bin Map):**** The mobile app MUST display a public map to Recyclers showing bin locations and general availability status.

* ****COLDASH-001 (Collector Dashboard & Route Map):**** The mobile app MUST display to a logged-in Collector a map and list of ****only the bins explicitly assigned to them****, along with live fill levels, fill-time predictions, and overflow alerts.

* ****COLDASH-002 (Mark as Serviced / Emptied):**** The system MUST allow a Collector to tap "Mark as Serviced" in the mobile app after emptying a bin, immediately updating the bin's fill level to 0% and setting its status back to `AVAILABLE`.

* ****FLT-003 (Immutable Admin Audit Logging):**** The system MUST record every administrative mutation (user bans, ledger adjustments, catalog changes, fleet updates) in an immutable audit table capturing Admin ID, action type, resource ID, timestamp, and justification reason.

* ****FLT-004 (Operational Analytics):**** The Web Admin Dashboard MUST aggregate and display key performance metrics (Daily Active Users, points issued vs. redeemed, recycling volume by material type, and contamination rates).


&nbsp;


# **3\. Requirements Traceability Matrix (RTM Summary)**

| Module Code | Module Description | Primary Actor | Primary Interface |
| :---- | :---- | :---- | :---- |
| **AUTH / IAM** | Identity, Access & Moderation | Recycler / Collector / Admin | Mobile App / Web Admin |
| **TRX / AIE** | QR Scanning & AI Disposal Cycle | Recycler / Smart Bin | Mobile App / IoT Hardware |
| **SURV** | Post-Disposal Survey & Active Learning | Recycler / Admin | Mobile App / Web Admin |
| **WLET** | Wallet, Append-Only Ledger & Leaderboards | Recycler / Admin | Mobile App / Web Admin |
| **RWRD / MKT** | Rewards Marketplace & Vouchers | Recycler / Admin | Mobile App / Web Admin |
| **FLT / COLDASH / BINMAP** | Fleet Management & Collector Operations | Recycler / Collector / Admin | Mobile App / Web Admin |

# **4\. Architectural Rules & Data Boundaries**

1. **FR-RULE-001 (Single Mobile App Codebase):** Recyclers and Collectors MUST operate within the same mobile application build, with navigation, screens, and permissions determined dynamically by the authenticated user's role.  
2. **FR-RULE-002 (Sole Collector Provisioning Authority):** Collector accounts MUST NOT have self-registration capabilities under any circumstance; they are created and assigned exclusively by the System Administrator via the Web Admin Dashboard.  
3. **FR-RULE-003 (Atomic Financial Transactions):** All point calculations, credits, debits, and ledger updates MUST execute within ACID database transactions to prevent race conditions or ledger discrepancies.  
4. **FR-RULE-004 (Single Session Concurrency Enforcement):** Bins MUST NOT host parallel active disposal sessions. Scanning a bin's QR code while a session is active forces the termination of the active session, redirects the first user to their survey, and starts a new session for the second user.  
5. **FR-RULE-005 (No Remote Bin Control Operations):** The system design strictly prohibits remote software-based unlocking or hardware manipulation of bins from the administrative interface.

&nbsp;