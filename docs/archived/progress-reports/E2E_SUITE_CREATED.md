# Human E2E Suite - Created Successfully! 🎉

**Date**: 2024-12-24
**Status**: ✅ Scaffolded and ready for testing

---

## What Was Created

### 1. Script: `scripts/human_e2e_suite.sh`
Idempotent bash script that scaffolds and manages the E2E test suite.

**Capabilities:**
- ✅ Scaffolds all Playwright files (config, Page Objects, test flows)
- ✅ Starts Mailpit container for email capture
- ✅ Runs browser-only tests (no DB/RPC shortcuts)
- ✅ Generates human QA checklist
- ✅ Environment sanity checks

### 2. Playwright Config: `playwright.config.ts`
**Projects configured:**
- Desktop Chrome
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

**Settings:**
- Test timeout: 90 seconds
- Trace on first retry
- Video on failure
- Screenshots on failure
- HTML report generation

### 3. Page Object Models (POMs)

#### `e2e/pom/AuthPage.ts`
Login and signup via UI only (no shortcuts).
- `login(email, password)` - Full login flow
- `signup(email, password)` - Full signup flow
- `logout()` - Logout and verify

#### `e2e/pom/LandlordPage.ts`
Landlord property and invite management.
- `goToProperties()` - Navigate to properties list
- `ensureAtLeastOneProperty()` - Create property if none exist
- `openFirstProperty()` - Open property details
- `openInvite()` - Navigate to invite screen

#### `e2e/pom/InvitePage.ts`
Invite creation flows.
- `createCodeInvite()` - Generate shareable code, returns token/link
- `sendEmailInvite(email)` - Send email invite via UI

#### `e2e/pom/TenantPage.ts`
Tenant invite acceptance.
- `acceptInviteFromLink(link)` - Open invite link and accept
- `expectTenantPropertyVisible()` - Verify property appears
- `expectInviteInvalid()` - Verify invalid/expired message

#### `e2e/pom/MailpitPage.ts`
**Human-like email interaction** (no API calls).
- `open()` - Navigate to Mailpit web UI
- `openLatestFor(recipient)` - Find and click email for recipient
- `clickFirstInviteLink()` - Click invite link in email body

### 4. Test Utilities: `e2e/utils/locators.ts`
Robust locator helpers that try multiple strategies.
- `firstVisible(page, strategies)` - Returns first visible locator
- `clickFirst(page, strategies)` - Click first visible element
- `fillFirst(page, strategies, value)` - Fill first visible input

**Strategy examples:**
1. Try `data-testid` first (most stable)
2. Fall back to accessible roles/labels
3. Fall back to CSS selectors
4. Throw error if none found

### 5. E2E Test Flows

#### `e2e/flows/invite-code-happy.spec.ts`
**Code Invite Happy Path** (authenticated tenant)
1. Landlord logs in
2. Ensures property exists (creates if needed)
3. Opens property → Invite Tenant → Shareable Code
4. Generates code
5. Landlord logs out
6. Tenant logs in
7. Opens invite link
8. Accepts invite
9. Verifies property appears in tenant dashboard
10. Revisits link → verifies shows "invalid"

#### `e2e/flows/invite-email-happy.spec.ts`
**Email Invite Happy Path** (unauthenticated tenant)
1. Landlord logs in
2. Ensures property exists
3. Opens property → Invite Tenant → Email
4. Sends email invite
5. Landlord logs out
6. **Opens Mailpit web UI** (like a human)
7. **Searches for email to tenant**
8. **Clicks email in list**
9. **Clicks invite link in email body**
10. Accepts invite (redirects to signup)
11. Completes signup
12. Auto-accepts invite
13. Verifies property appears

#### `e2e/flows/invite-negative.spec.ts`
**Negative Cases**
1. Invalid token → generic "invalid or expired" error
2. Reused/fake token → generic error

### 6. Environment Configuration: `.env.test`
Template for test environment variables.

```bash
BASE_URL=http://localhost:3000
LANDLORD_EMAIL=landlord@example.com
LANDLORD_PASSWORD=Password123!
TENANT_EMAIL=tenant@example.com
TENANT_PASSWORD=Password123!
USE_MAILPIT=true
MAILPIT_HTTP=http://127.0.0.1:8025
MAILPIT_SMTP_PORT=1025
```

---

## How to Use

### Quick Start (All-in-One)
```bash
# Initialize, start Mailpit, run tests, print checklist
bash scripts/human_e2e_suite.sh --init --mailpit --run --checklist
```

### Step-by-Step

**1. Initialize Suite (First Time)**
```bash
bash scripts/human_e2e_suite.sh --init
```

**2. Start Mailpit (For Email Tests)**
```bash
bash scripts/human_e2e_suite.sh --mailpit
# Mailpit UI: http://127.0.0.1:8025
```

**3. Run Tests**
```bash
bash scripts/human_e2e_suite.sh --run
```

**4. View Results**
```bash
npx playwright show-report
```

**5. Print Human QA Checklist**
```bash
bash scripts/human_e2e_suite.sh --checklist
```

**6. Check Environment**
```bash
bash scripts/human_e2e_suite.sh --doctor
```

### Individual Commands

**Run specific test file:**
```bash
npx playwright test e2e/flows/invite-code-happy.spec.ts
```

**Run specific browser:**
```bash
npx playwright test --project="Desktop Chrome"
```

**Run in headed mode (see browser):**
```bash
npx playwright test --headed
```

**Debug mode:**
```bash
npx playwright test --debug
```

---

## Required testIDs for Stability

The tests use accessible roles/labels first, but adding these testIDs makes them more stable across platforms (especially React Native Web):

### Auth Screens
- `auth-email` - Email input field
- `auth-password` - Password input field
- `auth-submit` - Login/Signup button
- `auth-signup` - Signup form/heading

### Navigation
- `nav-dashboard` - Dashboard link
- `nav-user-menu` - User menu button
- `nav-logout` - Logout button
- `nav-properties` - Properties link

### Property Management
- `property-add` - Add/Create property button
- `property-name` - Property name input
- `property-address` - Property address input
- `property-save` - Save property button
- `[data-testid^="property-card-"]` - Property cards (with ID suffix)

### Invite (Landlord)
- `invite-tenant` - Invite Tenant button
- `invite-screen` - Invite screen container
- `invite-mode-email` - Email mode tab/button
- `invite-mode-code` - Code mode tab/button
- `invite-email-input` - Email address input
- `invite-send` - Send invite button
- `invite-generate` - Generate code button
- `invite-code` - Generated code display
- `invite-sent-toast` - Success toast/message

### Invite (Tenant)
- `invite-property-preview` - Property preview container
- `invite-accept` - Accept invite button
- `invite-invalid` - Invalid/expired message
- `tenant-property-list` - Tenant properties list

---

## How It Works (Browser-Only Testing)

### Key Principle: NO Shortcuts
**Traditional E2E (with shortcuts):**
```typescript
// ❌ Bad: Directly inserts into DB
await db.insert('invites', { token: 'ABC123', property_id: propertyId });
```

**Human-True E2E (this suite):**
```typescript
// ✅ Good: Clicks through UI like a real user
await landlord.openInvite();
const token = await invite.createCodeInvite(); // Clicks buttons, extracts from UI
```

### Email Testing (Human-Like)
**Traditional approach:**
```typescript
// ❌ Bad: Calls Mailpit API
const emails = await fetch('http://mailpit:8025/api/v1/messages');
const link = extractLinkFromJSON(emails[0]);
```

**Human-True approach:**
```typescript
// ✅ Good: Opens Mailpit UI and clicks like a human
const mail = new MailpitPage(page, 'http://127.0.0.1:8025');
await mail.open();                      // Navigate to Mailpit web UI
await mail.openLatestFor(tenantEmail);  // Search and click email
await mail.clickFirstInviteLink();      // Click link in email body
```

### Locator Strategy (Resilient)
Tests try multiple locator strategies in order:
1. **testID** - Most stable: `getByTestId('invite-accept')`
2. **Accessible role** - Semantic: `getByRole('button', { name: /accept/i })`
3. **Label** - Form fields: `getByLabel(/email/i)`
4. **CSS selector** - Last resort: `locator('input[type="email"]')`

This ensures tests work even if testIDs are missing, but adding testIDs makes them faster and more stable.

---

## Mailpit Setup

### What is Mailpit?
Mailpit is a local email testing tool with a web UI.
- Captures all SMTP emails
- Provides web UI to browse/search emails
- No emails actually sent to real inboxes

### How to Use

**1. Start Mailpit:**
```bash
bash scripts/human_e2e_suite.sh --mailpit
# Or manually:
docker run -d --name mailpit --rm -p 8025:8025 -p 1025:1025 axllent/mailpit
```

**2. Configure Your App:**
Point your email sender to SMTP `localhost:1025` in development:

```typescript
// Example: Supabase Edge Function
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
});
```

**3. View Emails:**
Open http://127.0.0.1:8025 in your browser

**4. Stop Mailpit:**
```bash
docker stop mailpit
```

---

## Human QA Checklist

After automated tests pass, perform these manual checks:

### Core Flows (10-20 minutes)

**✅ Code Invite (Authenticated)**
1. Login as landlord
2. Open property → Invite Tenant → Shareable Code
3. Generate code
4. Copy link
5. Login as tenant
6. Open link
7. Accept invite
8. Verify property appears
9. Revisit link → shows "invalid"

**✅ Email Invite (Unauthenticated → Signup)**
1. Login as landlord
2. Invite Tenant → Email → Send
3. Open Mailpit UI (or real inbox)
4. Click email
5. Click invite link
6. Invite preview shows
7. Click Accept → redirected to signup
8. Complete signup
9. Auto-accept → property appears

### Robustness

**✅ Wrong Account**
- Accept with Tenant A
- Login as Tenant B
- Open same link → shows invalid

**✅ Edge Network**
- Chrome DevTools → Network throttling (Slow 3G)
- Try invite flow → UX degrades gracefully

**✅ Visual**
- Check copy, spacing, alignment
- Focus outlines visible
- Keyboard navigation works

### Device Checks

**✅ Mobile Viewports**
- Chrome DevTools → responsive mode
- Test Pixel 5, iPhone 12 sizes
- Verify invite screens responsive

**✅ Real Devices (Optional)**
- Send email to real phone
- Click link on iOS/Android
- Verify opens app/web correctly

### Deliverability

**✅ Email Quality**
- DKIM/SPF pass (check headers)
- Lands in inbox (not spam)
- Link not rewritten/stripped

### Observability

**✅ Logs/Analytics**
- Verify create/validate/accept events logged
- No raw tokens/emails in logs

---

## Troubleshooting

### Tests Fail: Element Not Found

**Symptom:**
```
Error: No visible locator matched among provided strategies.
```

**Solutions:**
1. Add the recommended `data-testid` to your component
2. Check if element text changed
3. Verify element is actually visible (not hidden by CSS)
4. Run in headed mode to see: `npx playwright test --headed`

### Email Tests Fail: Mailpit Not Found

**Symptom:**
```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8025
```

**Solutions:**
1. Start Mailpit: `bash scripts/human_e2e_suite.sh --mailpit`
2. Verify running: `docker ps | grep mailpit`
3. Check port: `lsof -i :8025`

### App Not Sending to Mailpit

**Symptom:**
No emails appear in Mailpit UI.

**Solutions:**
1. Verify app SMTP config points to `localhost:1025`
2. Check Mailpit logs: `docker logs mailpit`
3. Test SMTP manually:
   ```bash
   telnet localhost 1025
   EHLO test
   MAIL FROM: test@example.com
   RCPT TO: tenant@example.com
   DATA
   Subject: Test

   Test body
   .
   QUIT
   ```

### Tests Pass but Manual Testing Fails

**Symptom:**
Automated tests pass but feature doesn't work in real browser.

**Solutions:**
1. Check test selectors aren't too permissive
2. Verify test data setup is realistic
3. Add more assertions in tests
4. Test in incognito/private mode manually
5. Clear browser cache/storage

---

## Next Steps

### 1. Add Missing testIDs
Review the "Required testIDs" section and add them to your React components:

```tsx
// Example: React Native component
<TouchableOpacity testID="invite-accept" onPress={handleAccept}>
  <Text>Accept Invite</Text>
</TouchableOpacity>

// React Native Web automatically maps testID → data-testid
```

### 2. Configure SMTP for Mailpit
Update your email sender to use `localhost:1025` in development.

### 3. Run the Tests
```bash
# Start dev server
npm start

# In another terminal:
bash scripts/human_e2e_suite.sh --mailpit --run
```

### 4. View the Report
```bash
npx playwright show-report
```

### 5. Fix Failures
- Add missing testIDs
- Update selectors
- Fix broken flows

### 6. Run Manual QA Checklist
Use the checklist above to verify edge cases.

---

## CI Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start Mailpit
        run: docker run -d --name mailpit --rm -p 8025:8025 -p 1025:1025 axllent/mailpit

      - name: Start app
        run: npm start &
        env:
          SMTP_HOST: localhost
          SMTP_PORT: 1025

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000
          LANDLORD_EMAIL: landlord@example.com
          LANDLORD_PASSWORD: Password123!
          TENANT_EMAIL: tenant@example.com
          TENANT_PASSWORD: Password123!
          USE_MAILPIT: true
          MAILPIT_HTTP: http://127.0.0.1:8025

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Summary

✅ **Created:**
- Executable script: `scripts/human_e2e_suite.sh`
- Playwright config: `playwright.config.ts`
- 5 Page Object Models in `e2e/pom/`
- Locator utilities in `e2e/utils/`
- 3 E2E test flows in `e2e/flows/`
- Environment template: `.env.test`

✅ **Key Features:**
- **Browser-only testing** - No DB/RPC shortcuts
- **Human-like email testing** - Opens Mailpit UI and clicks links
- **Resilient locators** - Multiple strategies per element
- **Cross-platform** - Desktop Chrome, Mobile Chrome, Mobile Safari
- **Idempotent** - Safe to run multiple times

⚠️ **Next Actions:**
1. Add recommended testIDs to components
2. Configure app to send emails to `localhost:1025`
3. Run tests: `bash scripts/human_e2e_suite.sh --mailpit --run`
4. Fix any failures
5. Run manual QA checklist
6. Integrate into CI pipeline

🎯 **Goal Achieved:**
You now have a complete, human-true E2E test suite that tests the new invite system exactly like a real user would - including opening emails and clicking invite links!
