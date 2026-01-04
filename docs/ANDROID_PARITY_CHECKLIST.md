**Android Parity Checklist**

**Deep Linking**
- Configure Android App Links in app.json (intentFilters) and host `assetlinks.json`.
- Obtain SHA-256 certificate fingerprint; verify association.
- Test `myailandlord://invite` and `https://myailandlord.app/invite` on device.

**Notifications**
- Set up FCM and add `google-services.json`.
- Register device tokens; handle notification permissions and channels.
- Validate routing from foreground/background/tapped.

**Permissions & Media**
- Camera/storage permissions prompts and flows.
- File URI handling and media uploads (images/videos) and size constraints.
- Test media capture/selection and upload reliability.

**Navigation**
- Back button behavior with zero-flash navigation (reset stacks correctly).
- Verify invite accept → Tenant Home without intermediate flashes.

**UX/Layouts**
- Check density and touch targets across common devices.
- Keyboard handling, safe areas, and modal behavior.

**Testing Pass**
- Invite acceptance (cold start + warm) works.
- Messaging real-time, request status changes, and media uploads.
- Push notifications received and route to correct destinations.

**Release**
- Internal testing track on Play Console.
- Obfuscation/Proguard settings as needed.
