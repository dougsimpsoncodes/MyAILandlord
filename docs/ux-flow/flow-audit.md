# MyAI Landlord User-Flow Audit (Current Branch)

Branch reviewed: `fix/ios-keyboard-inset-auth`
Commit reviewed: `c2ca99b`
Scope: currently reachable screens (non-feature-flagged paths), with first-time landlord as the primary journey.

## Primary Journey: First-Time Landlord (Happy Path)

1. `Bootstrap` (`RootNavigator`) decides unauthenticated user goes to `Auth`.
2. `OnboardingWelcome` -> `OnboardingName`.
3. `OnboardingName` -> `OnboardingAccount`.
4. `OnboardingAccount` -> `OnboardingRole`.
5. `OnboardingRole` (`landlord`) -> reset to `LandlordOnboardingWelcome`.
6. `LandlordOnboardingWelcome` -> `LandlordPropertyIntro`.
7. `LandlordPropertyIntro` -> `PropertyBasics`.
8. `PropertyBasics` -> `PropertyAttributes`.
9. `PropertyAttributes` -> `PropertyAreas`.
10. `PropertyAreas` -> `PropertyAssets`.
11. `PropertyAssets` -> `PropertyReview`.
12. `PropertyReview` -> `PropertyDetails` (intended), then `InviteTenant`.
13. `InviteTenant` post-send state (code/link generated or email sent).

## Code Review Findings (Ordered by Severity)

### 1) Broken navigation target after review in Auth onboarding path
Severity: High

`PropertyReviewScreen` always navigates to `PropertyDetails` after submit, but `AuthStack` does not register a `PropertyDetails` route.

Evidence:
- Submit navigates to `PropertyDetails`: `src/screens/landlord/PropertyReviewScreen.tsx:222`, `src/screens/landlord/PropertyReviewScreen.tsx:332`
- Auth landlord path routes (no `PropertyDetails`): `src/navigation/AuthStack.tsx:151`, `src/navigation/AuthStack.tsx:155`, `src/navigation/AuthStack.tsx:156`, `src/navigation/AuthStack.tsx:157`

Impact:
- First-time landlord flow can dead-end after property review/submit in the auth-based onboarding flow.

### 2) Landlord onboarding stack in `MainStack` is missing `PropertyReview`
Severity: High

`PropertyAssetsListScreen` navigates to `PropertyReview`, but the `LandlordRootStack` onboarding routes do not include `PropertyReview`.

Evidence:
- Navigation action: `src/screens/landlord/PropertyAssetsListScreen.tsx:732`
- Onboarding stack screens in `LandlordRootStack` (missing `PropertyReview`): `src/navigation/MainStack.tsx:435`, `src/navigation/MainStack.tsx:453`, `src/navigation/MainStack.tsx:460`, `src/navigation/MainStack.tsx:465`

Impact:
- Existing authenticated landlords who still need onboarding can hit an unhandled navigation action.

### 3) Onboarding completion path is internally inconsistent
Severity: High

`PropertyAreasScreen` creates the property during onboarding and passes `propertyId` forward. `PropertyReviewScreen` determines first-time onboarding using `!propertyId`, so it skips the atomic onboarding RPC once property exists.

Evidence:
- Property creation in onboarding: `src/screens/landlord/PropertyAreasScreen.tsx:982`, `src/screens/landlord/PropertyAreasScreen.tsx:1014`, `src/screens/landlord/PropertyAreasScreen.tsx:1058`
- First-time check: `src/screens/landlord/PropertyReviewScreen.tsx:172`

Impact:
- Onboarding-completion side effects depend on path timing and may not align with the intended single source of truth (`onboarding_completed`).

### 4) Invite flow implementation is duplicated and inconsistent
Severity: Medium

There are two invite screens with different URL-generation behavior, including a hardcoded local IP in one path.

Evidence:
- Hardcoded dev URL/IP: `src/screens/landlord/InviteTenantScreen.tsx:60`
- Alternate URL strategy in onboarding invite screen: `src/screens/onboarding/LandlordTenantInviteScreen.tsx:84`, `src/screens/onboarding/LandlordTenantInviteScreen.tsx:90`

Impact:
- Inconsistent invite behavior across flows and environments; easier to regress and harder to debug.

### 5) Intro promises a 3-step property setup that does not match the implemented screens
Severity: Low

`LandlordPropertyIntroScreen` describes three steps ending at invite, but actual flow includes assets and review before invite.

Evidence:
- Intro step copy: `src/screens/onboarding/LandlordPropertyIntroScreen.tsx:25`
- Actual flow routes include assets/review: `src/navigation/AuthStack.tsx:154`, `src/navigation/AuthStack.tsx:155`, `src/navigation/AuthStack.tsx:156`

Impact:
- User expectation mismatch; contributes to perceived complexity.

## All Current Pages Inventory (Reachable Wiring)

### Root
- `Bootstrap`
- `Auth`
- `PropertyInviteAccept`
- `Main`

### Auth / Onboarding Stack
- `Welcome`
- `OnboardingWelcome`
- `OnboardingName`
- `OnboardingAccount`
- `OnboardingRole`
- `LandlordOnboardingWelcome`
- `LandlordPropertyIntro`
- `PropertyBasics`
- `PropertyAttributes`
- `PropertyAreas`
- `PropertyAssets`
- `PropertyReview`
- `LandlordTenantInvite`
- `LandlordOnboardingSuccess`
- `TenantOnboardingWelcome`
- `TenantInviteRoommate`
- `TenantOnboardingSuccess`
- `AuthForm`
- `Login`
- `SignUp`
- `AuthCallback`
- `PropertyInviteAccept`

### Landlord App (Main)
- Tabs: `LandlordHome`, `LandlordRequests`, `LandlordProperties`, `LandlordMessages`, `LandlordProfile`
- Home/Requests/Messages shared detail: `CaseDetail`, `LandlordChat`
- Property management flow: `PropertyDetails`, `PropertyBasics`, `PropertyAreas`, `PropertyAssets`, `PropertyReview`, `AddAsset`, `InviteTenant`
- Legacy property-photo path: `PropertyPhotos`, `RoomSelection`, `RoomPhotography`, `AssetScanning`, `AssetDetails`, `AssetPhotos`, `ReviewSubmit`
- Profile/settings: `LandlordProfileMain`, `EditProfile`, `Security`, `Notifications`, `HelpCenter`, `ContactSupport`

### Tenant App (Main)
- Tabs: `TenantHome`, `TenantRequests`, `TenantMessages`, `TenantProfile`
- Home flow: `TenantHomeMain`, `ReportIssue`, `ReviewIssue`, `SubmissionSuccess`, `FollowUp`, `ConfirmSubmission`, `PropertyCodeEntry`, `PropertyInviteAccept`, `PropertyWelcome`, `PropertyInfo`, `CommunicationHub`
- Requests: `TenantRequestsMain`, `FollowUp`
- Messages: `TenantMessagesMain`
- Profile/settings: `TenantProfileMain`, `EditProfile`, `Security`, `Notifications`, `HelpCenter`, `ContactSupport`

## Simplification Recommendations (Flow-First)

1. Collapse landlord onboarding to one canonical stack path.
2. Use one post-review destination contract (`InviteTenant` or `LandlordTenantInvite`) and delete the other path.
3. Extract a single invite-link builder shared by all invite screens.
4. Make onboarding completion atomic in one place only (either at review-submit or at area creation, not both).
5. Align onboarding copy with actual step count and labels.
