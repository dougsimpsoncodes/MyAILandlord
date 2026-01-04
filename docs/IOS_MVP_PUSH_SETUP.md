**iOS MVP Push Setup**
- Goal: Enable APNs push for new message/request updates and handle routing in-app.

**Prerequisites**
- Apple Developer account with access to Certificates, Identifiers & Profiles.
- EAS project configured (see app.json `extra.eas.projectId`).
- Expo SDK 54 with `expo-notifications` installed (already present).

**Steps**
- APNs setup
  - Create an APNs Key in Apple Developer (Keys → + → Apple Push Notifications service). Download `.p8` and note Key ID + Team ID.
  - In Expo: `eas credentials` → iOS → set up push key or upload `.p8`.
  - Ensure bundle identifier in app.json matches the identifier used for the key.
- EAS build/TestFlight
  - For dev client: `npx expo run:ios --device "<Your iPhone Name>"` (quick dev testing).
  - For TestFlight: `eas build -p ios --profile production` and submit with `eas submit -p ios`.
- App permissions
  - On first run, request push permission via `expo-notifications`.
  - Capture Expo push token/device token for the authenticated user; store in Supabase.
- In-app handling
  - Foreground: Show in-app banner and allow tap to navigate.
  - Background/tapped: On response, deep-link to the correct screen (e.g., RequestDetail, Messages).
  - Use a lightweight handler in `usePushNotifications` (see src/hooks/usePushNotifications.ts).
- Server sending (later)
  - For MVP, manual sends via Expo Push API are enough to validate.
  - Post-MVP: queue + retries, interest topics per property, rate-limits.

**Routing contract (recommended)**
- Notification payload `data`:
  - `type`: `message` | `request_update`
  - `requestId` (if request-related)
  - `propertyId`
  - `route`: optional direct route name override

**Validation**
- Device registers a push token after sign-in.
- Send a test push via Expo Push API with payload above.
- App navigates correctly from foreground/background/tapped.

**Notes**
- Keep push logic behind feature flag if needed.
- For Android parity: configure FCM, google-services.json, and token registration later.
