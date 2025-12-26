#!/usr/bin/env bash
# Human-true E2E: all interactions through the browser only.
# - Scaffolds Playwright config, Page Objects, and 3 full flows
# - Uses Mailpit's web UI (not its API) to open invite emails and click the link
# - No DB calls, no RPC calls, no behind-the-scenes shortcuts
# - Provides a concise human testing checklist

set -euo pipefail

###############################################################################
# 0) Configuration — EDIT THESE (or set env before running)
###############################################################################
export BASE_URL="${BASE_URL:-http://localhost:3000}"         # Your app base URL
export LANDLORD_EMAIL="${LANDLORD_EMAIL:-landlord@example.com}"
export LANDLORD_PASSWORD="${LANDLORD_PASSWORD:-Password123!}"
export TENANT_EMAIL="${TENANT_EMAIL:-tenant@example.com}"
export TENANT_PASSWORD="${TENANT_PASSWORD:-Password123!}"

# Email capture UI (Mailpit). Test clicks inside its web UI, like a human.
export USE_MAILPIT="${USE_MAILPIT:-true}"                     # set to false to skip container start
export MAILPIT_HTTP="${MAILPIT_HTTP:-http://127.0.0.1:8025}"  # Mailpit UI URL
export MAILPIT_SMTP_PORT="${MAILPIT_SMTP_PORT:-1025}"         # SMTP port you've pointed your app/email at

# Directory structure for e2e
E2E_DIR="e2e"
POM_DIR="$E2E_DIR/pom"
FLOWS_DIR="$E2E_DIR/flows"
UTILS_DIR="$E2E_DIR/utils"

###############################################################################
# Helpers
###############################################################################
has_cmd() { command -v "$1" >/dev/null 2>&1; }
title() { printf "\n==> %s\n" "$1"; }

ensure_node() {
  title "Checking Node and npm"
  has_cmd node || { echo "ERROR: Node not found"; exit 1; }
  has_cmd npm || { echo "ERROR: npm not found"; exit 1; }
  node -v
  npm -v
}

ensure_playwright() {
  title "Ensuring Playwright is available"
  npx playwright --version >/dev/null 2>&1 || true
  npx playwright install --with-deps
}

start_mailpit() {
  if [ "${USE_MAILPIT}" != "true" ]; then
    echo "Skipping Mailpit startup."
    return
  fi
  title "Starting Mailpit (UI :8025, SMTP :${MAILPIT_SMTP_PORT})"
  if ! has_cmd docker; then
    echo "WARN: docker not found; cannot start Mailpit. Set USE_MAILPIT=false or install Docker."
    return
  fi
  # If already running, keep it
  if docker ps --format '{{.Names}}' | grep -q '^mailpit$'; then
    echo "Mailpit already running."
  else
    docker run -d --name mailpit --rm -p 8025:8025 -p ${MAILPIT_SMTP_PORT}:1025 axllent/mailpit >/dev/null
  fi
  echo "Mailpit UI: $MAILPIT_HTTP"
}

write_playwright_config() {
  title "Writing Playwright config (playwright.config.ts)"
  cat > playwright.config.ts <<'TS'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },
  ],
});
TS
}

write_utils() {
  title "Writing test utilities"
  mkdir -p "$UTILS_DIR"

  # A small helper to choose the first working locator strategy.
  cat > "$UTILS_DIR/locators.ts" <<'TS'
import { Page, Locator, expect } from '@playwright/test';

export async function firstVisible(page: Page, strategies: (() => Locator)[]): Promise<Locator> {
  for (const mk of strategies) {
    const loc = mk();
    try {
      await loc.first().waitFor({ state: 'visible', timeout: 2000 });
      return loc;
    } catch {}
  }
  throw new Error('No visible locator matched among provided strategies.');
}

export async function clickFirst(page: Page, strategies: (() => Locator)[]) {
  const loc = await firstVisible(page, strategies);
  await loc.first().click();
}

export async function fillFirst(page: Page, strategies: (() => Locator)[], value: string) {
  const loc = await firstVisible(page, strategies);
  await loc.first().fill(value);
}
TS
}

write_poms() {
  title "Writing Page Objects"
  mkdir -p "$POM_DIR"

  # Auth page: login and signup via UI only (adjust selectors if needed).
  cat > "$POM_DIR/AuthPage.ts" <<'TS'
import { Page, expect } from '@playwright/test';
import { clickFirst, fillFirst } from '../utils/locators';

export class AuthPage {
  constructor(private page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.page).toHaveURL(/\/login/i);
  }

  async gotoSignup() {
    await this.page.goto('/signup');
    await expect(this.page).toHaveURL(/\/signup/i);
  }

  async login(email: string, password: string) {
    await this.gotoLogin();
    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-email'),
      () => this.page.getByLabel(/email/i),
      () => this.page.locator('input[name="email"]'),
      () => this.page.getByRole('textbox', { name: /email/i }),
    ], email);

    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-password'),
      () => this.page.getByLabel(/password/i),
      () => this.page.locator('input[type="password"]'),
    ], password);

    await clickFirst(this.page, [
      () => this.page.getByTestId('auth-submit'),
      () => this.page.getByRole('button', { name: /sign in|log in/i }),
    ]);

    // Expect a dashboard nav to appear
    await expect(this.page.getByTestId('nav-dashboard').or(this.page.getByRole('link', { name: /dashboard/i }))).toBeVisible();
  }

  async signup(email: string, password: string) {
    await this.gotoSignup();

    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-email'),
      () => this.page.getByLabel(/email/i),
      () => this.page.locator('input[name="email"]'),
    ], email);

    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-password'),
      () => this.page.getByLabel(/password/i),
      () => this.page.locator('input[type="password"]'),
    ], password);

    await clickFirst(this.page, [
      () => this.page.getByTestId('auth-submit'),
      () => this.page.getByRole('button', { name: /sign up|create account/i }),
    ]);

    await expect(this.page.getByTestId('nav-dashboard').or(this.page.getByRole('link', { name: /dashboard/i }))).toBeVisible();
  }

  async logout() {
    await clickFirst(this.page, [
      () => this.page.getByTestId('nav-user-menu'),
      () => this.page.getByRole('button', { name: /account|profile|user/i }),
    ]);

    await clickFirst(this.page, [
      () => this.page.getByTestId('nav-logout'),
      () => this.page.getByRole('menuitem', { name: /log out|sign out/i }),
      () => this.page.getByRole('button', { name: /log out|sign out/i }),
    ]);

    await expect(this.page.getByTestId('auth-submit').or(this.page.getByRole('button', { name: /sign in|log in/i }))).toBeVisible();
  }
}
TS

  # Landlord area: ensure property exists or create one, navigate to invite UI
  cat > "$POM_DIR/LandlordPage.ts" <<'TS'
import { Page, expect } from '@playwright/test';
import { clickFirst, fillFirst } from '../utils/locators';

export class LandlordPage {
  constructor(private page: Page) {}

  async goToProperties() {
    await clickFirst(this.page, [
      () => this.page.getByTestId('nav-properties'),
      () => this.page.getByRole('link', { name: /properties/i }),
      () => this.page.getByRole('link', { name: /manage.*properties/i }),
    ]);
    await expect(this.page).toHaveURL(/properties/i);
  }

  async ensureAtLeastOneProperty() {
    await this.goToProperties();
    const anyCard = this.page.locator('[data-testid^="property-card-"]').first();
    if (await anyCard.count() > 0) return;

    // Create a property through the UI, if button exists.
    await clickFirst(this.page, [
      () => this.page.getByTestId('property-add'),
      () => this.page.getByRole('button', { name: /add property|new property|create property/i }),
      () => this.page.getByRole('link',   { name: /add property|new property|create property/i }),
    ]);

    await fillFirst(this.page, [
      () => this.page.getByTestId('property-name'),
      () => this.page.getByLabel(/name/i),
    ], 'Test Property');

    await fillFirst(this.page, [
      () => this.page.getByTestId('property-address'),
      () => this.page.getByLabel(/address/i),
    ], '123 Test St');

    await clickFirst(this.page, [
      () => this.page.getByTestId('property-save'),
      () => this.page.getByRole('button', { name: /save|create/i }),
    ]);

    // Wait until at least one card appears
    await expect(this.page.locator('[data-testid^="property-card-"]').first()).toBeVisible();
  }

  async openFirstProperty() {
    await this.goToProperties();
    await clickFirst(this.page, [
      () => this.page.locator('[data-testid^="property-card-"]').first(),
      () => this.page.getByRole('link', { name: /test property/i }),
    ]);
  }

  async openInvite() {
    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-tenant'),
      () => this.page.getByRole('button', { name: /invite tenant/i }),
    ]);
    await expect(this.page.getByTestId('invite-screen').or(this.page.getByRole('heading', { name: /invite/i }))).toBeVisible();
  }
}
TS

  # Invite UI in landlord flow
  cat > "$POM_DIR/InvitePage.ts" <<'TS'
import { Page, expect } from '@playwright/test';
import { clickFirst, fillFirst } from '../utils/locators';

export class InvitePage {
  constructor(private page: Page) {}

  async createCodeInvite(): Promise<string> {
    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-mode-code'),
      () => this.page.getByRole('tab', { name: /code/i }),
      () => this.page.getByRole('button', { name: /shareable code/i }),
    ]);

    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-generate'),
      () => this.page.getByRole('button', { name: /generate/i }),
    ]);

    // Either full link or just the code is displayed
    const content = await this.page.getByTestId('invite-code').or(this.page.getByRole('textbox').or(this.page.locator('[data-testid^="invite-code"]'))).first().textContent();
    if (!content) throw new Error('No invite code/link visible.');
    return content.trim();
  }

  async sendEmailInvite(email: string) {
    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-mode-email'),
      () => this.page.getByRole('tab', { name: /email/i }),
      () => this.page.getByRole('button', { name: /email invite/i }),
    ]);

    await fillFirst(this.page, [
      () => this.page.getByTestId('invite-email-input'),
      () => this.page.getByLabel(/email/i),
      () => this.page.locator('input[type="email"]'),
    ], email);

    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-send'),
      () => this.page.getByRole('button', { name: /send invite|send/i }),
    ]);

    await expect(this.page.getByTestId('invite-sent-toast').or(this.page.getByText(/invite sent|email sent/i))).toBeVisible();
  }
}
TS

  # Tenant area
  cat > "$POM_DIR/TenantPage.ts" <<'TS'
import { Page, expect } from '@playwright/test';
import { clickFirst } from '../utils/locators';

export class TenantPage {
  constructor(private page: Page) {}

  async acceptInviteFromLink(link: string) {
    await this.page.goto(link);
    await expect(this.page.getByTestId('invite-property-preview').or(this.page.getByRole('heading', { name: /invitation|invite/i }))).toBeVisible();

    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-accept'),
      () => this.page.getByRole('button', { name: /accept/i }),
    ]);
  }

  async expectTenantPropertyVisible() {
    await expect(this.page.getByTestId('tenant-property-list').or(this.page.getByRole('heading', { name: /properties/i }))).toBeVisible();
  }

  async expectInviteInvalid() {
    await expect(this.page.getByTestId('invite-invalid').or(this.page.getByText(/invalid|expired/i))).toBeVisible();
  }
}
TS

  # Mailpit web UI interaction (no API): open Mailpit UI, click newest mail to tenant, then click invite link in message body.
  cat > "$POM_DIR/MailpitPage.ts" <<'TS'
import { Page, expect } from '@playwright/test';

export class MailpitPage {
  constructor(private page: Page, private mailpitUrl: string) {}

  async open() {
    await this.page.goto(this.mailpitUrl);
    await expect(this.page).toHaveTitle(/mailpit/i);
    // Wait for messages list to render
    await this.page.waitForTimeout(1000);
  }

  async openLatestFor(recipient: string) {
    // Mailpit UI shows a list; filter by recipient if UI supports it, otherwise click first and verify inside.
    // Try a search box (Mailpit has a search bar at top):
    const search = this.page.locator('input[type="search"], input[type="text"][placeholder*="search" i]');
    if (await search.count() > 0) {
      await search.first().fill(`to:${recipient}`);
      await search.first().press('Enter');
      await this.page.waitForTimeout(1000);
    }

    // Click the first row in message list
    const firstRow = this.page.locator('table tbody tr').first().or(this.page.locator('[role="row"]').nth(1));
    await firstRow.click();

    // Verify the preview pane loads
    await expect(this.page.locator('iframe, .content, #message, .message')).toBeVisible({ timeout: 5000 });
  }

  async clickFirstInviteLink() {
    // Mailpit renders HTML; sometimes inside an iframe or right pane.
    // Try links in the main document:
    let linkLoc = this.page.locator('a:has-text("invite"), a[href*="/invite?"]');
    if (await linkLoc.count() === 0) {
      // If HTML body inside iframe, search there
      const ifr = this.page.frameLocator('iframe');
      linkLoc = ifr.locator('a:has-text("invite"), a[href*="/invite?"]');
    }
    await expect(linkLoc.first()).toBeVisible();
    const href = await linkLoc.first().getAttribute('href');
    await linkLoc.first().click();
    return href;
  }
}
TS
}

write_flows() {
  title "Writing browser-only E2E flows"
  mkdir -p "$FLOWS_DIR"

  # 1) Code invite: landlord logs in → generate code → tenant logs in → open link → accept → verify → reuse invalid
  cat > "$FLOWS_DIR/invite-code-happy.spec.ts" <<'TS'
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { LandlordPage } from '../pom/LandlordPage';
import { InvitePage } from '../pom/InvitePage';
import { TenantPage } from '../pom/TenantPage';

test.describe('Invite (Code) — human-true', () => {
  test('landlord creates code; tenant accepts while logged in', async ({ page, baseURL }) => {
    const auth = new AuthPage(page);
    const landlord = new LandlordPage(page);
    const invite = new InvitePage(page);
    const tenant = new TenantPage(page);

    const landlordEmail = process.env.LANDLORD_EMAIL!;
    const landlordPassword = process.env.LANDLORD_PASSWORD!;
    const tenantEmail = process.env.TENANT_EMAIL!;
    const tenantPassword = process.env.TENANT_PASSWORD!;

    // Landlord logs in (or signs up if needed)
    await auth.login(landlordEmail, landlordPassword).catch(async () => {
      await auth.signup(landlordEmail, landlordPassword);
    });

    // Ensure a property exists and open invite screen
    await landlord.ensureAtLeastOneProperty();
    await landlord.openFirstProperty();
    await landlord.openInvite();

    // Create a shareable code
    const codeOrLink = await invite.createCodeInvite();
    const link = codeOrLink.startsWith('http') ? codeOrLink : `${baseURL}/invite?t=${codeOrLink}`;

    // Landlord logs out
    await auth.logout();

    // Tenant logs in and accepts
    await auth.login(tenantEmail, tenantPassword).catch(async () => {
      await auth.signup(tenantEmail, tenantPassword);
    });

    await tenant.acceptInviteFromLink(link);
    await tenant.expectTenantPropertyVisible();

    // Reuse should be invalid
    await page.goto(link);
    await tenant.expectInviteInvalid();
  });
});
TS

  # 2) Email invite: landlord sends email → open Mailpit UI → click link → accept logged-out → signup → auto-accept
  cat > "$FLOWS_DIR/invite-email-happy.spec.ts" <<'TS'
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { LandlordPage } from '../pom/LandlordPage';
import { InvitePage } from '../pom/InvitePage';
import { MailpitPage } from '../pom/MailpitPage';
import { TenantPage } from '../pom/TenantPage';

test.describe('Invite (Email) — human-true', () => {
  test.skip(process.env.USE_MAILPIT !== 'true', 'Requires Mailpit web UI available');

  test('landlord sends email; tenant opens link from email UI while logged out → signup → auto-accept', async ({ page }) => {
    const auth = new AuthPage(page);
    const landlord = new LandlordPage(page);
    const invite = new InvitePage(page);
    const tenant = new TenantPage(page);

    const landlordEmail = process.env.LANDLORD_EMAIL!;
    const landlordPassword = process.env.LANDLORD_PASSWORD!;
    const tenantEmail = process.env.TENANT_EMAIL!;
    const tenantPassword = process.env.TENANT_PASSWORD!;
    const mailpitUrl = process.env.MAILPIT_HTTP || 'http://127.0.0.1:8025';

    // Landlord logs in (or signs up)
    await auth.login(landlordEmail, landlordPassword).catch(async () => {
      await auth.signup(landlordEmail, landlordPassword);
    });

    // Ensure a property exists and open invite screen
    await landlord.ensureAtLeastOneProperty();
    await landlord.openFirstProperty();
    await landlord.openInvite();

    // Send email invite
    await invite.sendEmailInvite(tenantEmail);

    // Landlord logs out
    await auth.logout();

    // Open Mailpit web UI and click the invite link like a human
    const mail = new MailpitPage(page, mailpitUrl);
    await mail.open();
    await mail.openLatestFor(tenantEmail);
    const maybeHref = await mail.clickFirstInviteLink();

    // Now we are on the invite preview page in our app (new tab or same window depending on Mailpit UI).
    // If Mailpit opened a new tab, current page may still be Mailpit; handle both cases:
    if (maybeHref && !(page.url().includes('/invite'))) {
      await page.goto(maybeHref);
    }

    // Accepting while logged out should redirect to signup
    await expect(page.getByTestId('invite-property-preview').or(page.getByRole('heading', { name: /invitation/i }))).toBeVisible();
    await page.getByTestId('invite-accept').or(page.getByRole('button', { name: /accept/i })).click();

    // Complete signup or login
    await expect(page.getByTestId('auth-signup').or(page.getByRole('heading', { name: /sign up|create account/i }))).toBeVisible();
    await page.getByTestId('auth-email').or(page.getByLabel(/email/i)).fill(tenantEmail);
    await page.getByTestId('auth-password').or(page.getByLabel(/password/i)).fill(tenantPassword);
    await page.getByTestId('auth-submit').or(page.getByRole('button', { name: /sign up|sign in|continue/i })).click();

    // After auth, auto-accept should link tenant to property
    await expect(page.getByTestId('tenant-property-list').or(page.getByRole('heading', { name: /properties/i }))).toBeVisible();
  });
});
TS

  # 3) Negative cases only through browser: invalid token, wrong user reuse
  cat > "$FLOWS_DIR/invite-negative.spec.ts" <<'TS'
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { TenantPage } from '../pom/TenantPage';

test.describe('Invite (Negative) — human-true', () => {
  test('invalid token shows generic invalid', async ({ page, baseURL }) => {
    const tenant = new TenantPage(page);
    await page.goto(`${baseURL}/invite?t=THIS_IS_NOT_VALID_12345`);
    await tenant.expectInviteInvalid();
  });

  test('reuse blocked for different user (simulate as anonymous second visit)', async ({ page, baseURL }) => {
    // Simulate by visiting a bad link or previously used link.
    // If your run captured a real used link, you can pipe it via env and use here.
    await page.goto(`${baseURL}/invite?t=THIS_WAS_USED_OR_FAKE`);
    await expect(page.getByTestId('invite-invalid').or(page.getByText(/invalid|expired/i))).toBeVisible();
  });
});
TS
}

write_env_hint() {
  title "Creating local .env.test hint (non-secret placeholders)"
  cat > .env.test <<ENV
# Used by Playwright tests (npx playwright test will read process env if exported)
BASE_URL=${BASE_URL}
LANDLORD_EMAIL=${LANDLORD_EMAIL}
LANDLORD_PASSWORD=${LANDLORD_PASSWORD}
TENANT_EMAIL=${TENANT_EMAIL}
TENANT_PASSWORD=${TENANT_PASSWORD}
USE_MAILPIT=${USE_MAILPIT}
MAILPIT_HTTP=${MAILPIT_HTTP}
MAILPIT_SMTP_PORT=${MAILPIT_SMTP_PORT}
ENV
  echo "Note: .env.test created for reference; export variables in your shell or CI."
}

run_tests() {
  title "Running Playwright tests (browser-only)"
  if [ ! -f package.json ]; then
    npm init -y >/dev/null
  fi
  npm pkg set type="module" >/dev/null
  npm i -D @playwright/test >/dev/null
  npx playwright install --with-deps

  set -a
  [ -f .env.test ] && source .env.test || true
  set +a

  npx playwright test --project="Mobile Chrome" --project="Mobile Safari" --project="Desktop Chrome"
  echo "Playwright report: npx playwright show-report"
}

print_checklist() {
  title "Human QA checklist (10–20 minutes)"
  cat <<'TXT'
Core flows
- Code invite (authed):
  - Login as landlord → open property → Invite Tenant → Shareable Code → Generate
  - Copy link → login as tenant → open link → Accept → property appears
  - Revisit link → shows generic invalid

- Email invite (unauth → signup):
  - Login as landlord → Invite Tenant → Email → Send
  - In Mailpit UI (or real inbox), open the invite email and click the link
  - Invite preview shows → Accept → redirected to signup → complete signup → auto-accept → property appears

Robustness
- Wrong account:
  - Accept with Tenant A. While logged in as Tenant B, open same link → invalid

- Edge network:
  - Try link on slow network (devtools throttling) → ensure UX degrades gracefully

- Visual:
  - Check copy, spacing, focus outlines, and keyboard navigation

Device checks
- Mobile viewports:
  - In desktop browser responsive mode, check invite preview and accept screens
- Real devices (optional but recommended):
  - Click link on iOS/Android device (from an email sent to that device) → ensure it opens your web/app correctly

Deliverability
- Ensure mails pass DKIM/SPF and land in inbox (not spam)
- Verify link not rewritten by provider (tracking) that strips ?t=TOKEN

Observability
- Confirm logs/analytics show invite create/validate/accept events with no raw tokens/emails
TXT
}

doctor() {
  title "Doctor: quick sanity checks"
  echo "- Node: $(node -v 2>/dev/null || echo MISSING)"
  echo "- npm:  $(npm -v 2>/dev/null || echo MISSING)"
  echo "- Playwright: $(npx playwright --version 2>/dev/null || echo MISSING)"
  echo "- BASE_URL: ${BASE_URL}"
  echo "- Mailpit: ${USE_MAILPIT} (UI ${MAILPIT_HTTP}, SMTP ${MAILPIT_SMTP_PORT})"
}

usage() {
  cat <<'U'
Usage:
  bash scripts/human_e2e_suite.sh [--init] [--mailpit] [--run] [--checklist] [--doctor]

Flags:
  --init       Scaffold Playwright config, Page Objects, and flows (browser-only)
  --mailpit    Start local Mailpit (Docker) for email UI (tests click inside the UI)
  --run        Install deps and run Playwright tests
  --checklist  Print the human QA checklist
  --doctor     Show environment sanity info

Notes:
  - Update your app to send emails to SMTP on localhost:1025 (Mailpit) for local runs.
  - Tests rely on accessible roles/text when testIDs are missing; adding data-testid makes them more stable.
  - No DB/RPC/API calls are made; all interactions are via browser.
U
}

main() {
  local DO_INIT=false DO_RUN=false DO_MAILPIT=false DO_CHECKLIST=false DO_DOCTOR=false
  for arg in "$@"; do
    case "$arg" in
      --init) DO_INIT=true ;;
      --run) DO_RUN=true ;;
      --mailpit) DO_MAILPIT=true ;;
      --checklist) DO_CHECKLIST=true ;;
      --doctor) DO_DOCTOR=true ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown arg: $arg"; usage; exit 1 ;;
    esac
  done

  $DO_DOCTOR && doctor
  ensure_node
  ensure_playwright
  $DO_MAILPIT && start_mailpit
  $DO_INIT && {
    write_playwright_config
    write_utils
    write_poms
    write_flows
    write_env_hint
  }
  $DO_RUN && run_tests
  $DO_CHECKLIST && print_checklist
  if ! $DO_INIT && ! $DO_RUN && ! $DO_CHECKLIST && ! $DO_MAILPIT && ! $DO_DOCTOR; then
    usage
  fi
}

main "$@"
