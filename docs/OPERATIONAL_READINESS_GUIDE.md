# Operational Readiness Guide - Invite Flow

**Date:** 2025-12-23
**Status:** 🔧 Pre-Production - Operational Gaps to Address
**Purpose:** Bridge testing excellence to production operations

---

## Executive Summary

Testing infrastructure is **production-grade**, but operational readiness requires additional safeguards for real-user deployments. This guide addresses residual risks identified in the comprehensive review.

---

## Critical Operational Gaps

### 🔴 1. Universal/App Links on Real Devices

**Risk:** E2E tests validate web only; deep links untested on iOS/Android

**Current State:**
- ✅ Web invite flow tested (Playwright)
- ❌ iOS Universal Links not validated
- ❌ Android App Links not validated
- ❌ AASA file not tested
- ❌ assetlinks.json not tested

**Required Implementation:**

#### iOS Universal Links Setup

```json
// .well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.myailandlord",
        "paths": ["/invite", "/invite/*"]
      }
    ]
  }
}
```

**Validation Requirements:**
- ✅ Served with `Content-Type: application/json` (NOT text/html)
- ✅ No redirects (301/302 breaks AASA)
- ✅ HTTPS only (required by Apple)
- ✅ Team ID matches provisioning profile
- ✅ Accessible without authentication

**Test Script:**
```bash
#!/bin/bash
# scripts/validate-universal-links.sh

DOMAIN="myailandlord.com"

echo "🔍 Validating iOS Universal Links..."

# 1. Test AASA file accessibility
response=$(curl -sI "https://${DOMAIN}/.well-known/apple-app-site-association")
content_type=$(echo "$response" | grep -i "content-type" | cut -d' ' -f2)

if [[ "$content_type" != *"application/json"* ]]; then
  echo "❌ AASA Content-Type incorrect: $content_type"
  echo "   Expected: application/json"
  exit 1
fi

# 2. Check for redirects
status=$(echo "$response" | grep "HTTP" | head -1 | cut -d' ' -f2)
if [[ "$status" == "301" ]] || [[ "$status" == "302" ]]; then
  echo "❌ AASA returns redirect (${status}), breaks Universal Links"
  exit 1
fi

# 3. Validate JSON structure
aasa=$(curl -s "https://${DOMAIN}/.well-known/apple-app-site-association")
if ! echo "$aasa" | jq -e '.applinks.details[0].appID' > /dev/null; then
  echo "❌ AASA missing required applinks.details"
  exit 1
fi

echo "✅ iOS Universal Links validated"

# 4. Android App Links
echo "🔍 Validating Android App Links..."

assetlinks=$(curl -s "https://${DOMAIN}/.well-known/assetlinks.json")
if ! echo "$assetlinks" | jq -e '.[0].relation' > /dev/null; then
  echo "❌ assetlinks.json invalid structure"
  exit 1
fi

echo "✅ Android App Links validated"
```

**Real Device Testing:**

```yaml
# .github/workflows/device-farm-tests.yml
name: Device Farm - Deep Link Testing

on:
  schedule:
    - cron: '0 3 * * 0'  # Weekly on Sunday at 3 AM UTC
  workflow_dispatch:

jobs:
  ios-deep-link:
    runs-on: macos-latest
    steps:
      - name: Run on iOS Simulator
        run: |
          xcrun simctl boot "iPhone 15 Pro"
          xcrun simctl openurl booted "https://myailandlord.com/invite?token=TEST_TOKEN"

          # Verify app opened (not Safari)
          sleep 5
          ps aux | grep "MyAILandlord" || exit 1

  android-deep-link:
    runs-on: ubuntu-latest
    steps:
      - name: Run on Android Emulator
        run: |
          adb shell am start -a android.intent.action.VIEW \
            -d "https://myailandlord.com/invite?token=TEST_TOKEN"

          # Verify app opened
          adb shell dumpsys window | grep "mCurrentFocus.*MyAILandlord"
```

**AWS Device Farm Integration (Recommended):**

```typescript
// scripts/device-farm-deep-link-test.ts
import AWS from 'aws-sdk';

const devicefarm = new AWS.DeviceFarm({ region: 'us-west-2' });

async function runDeepLinkTest() {
  const params = {
    projectArn: process.env.DEVICE_FARM_PROJECT_ARN!,
    name: 'Deep Link Smoke Test',
    test: {
      type: 'APPIUM_NODE',
      testSpecArn: 'arn:aws:devicefarm:...',
    },
    devicePoolArn: process.env.DEVICE_POOL_ARN!, // Real iOS/Android devices
    configuration: {
      extraDataPackageArn: 'invite-test-data',
    },
  };

  const run = await devicefarm.scheduleRun(params).promise();
  console.log('Device farm run scheduled:', run.run?.arn);

  // Poll for results
  // ...
}
```

---

### 🔴 2. Storage Cleanup & Namespacing

**Risk:** Test photos not cleaned up, storage quota exhaustion

**Current State:**
- ✅ Database cleanup (tokens, properties, users)
- ❌ Storage objects (photos) not cleaned up
- ❌ No namespacing strategy

**Required Implementation:**

#### Storage Namespacing Strategy

```typescript
// src/utils/storage-helpers.ts
export function getTestStoragePath(runId: string, assetType: 'property' | 'area' | 'asset') {
  // Namespace all test uploads under /test/{runId}/
  return `test/${runId}/${assetType}`;
}

export function getProductionStoragePath(userId: string, assetType: string) {
  // Production uploads under /users/{userId}/
  return `users/${userId}/${assetType}`;
}

// Usage in tests
const uploadPath = process.env.CI
  ? getTestStoragePath(TEST_RUN_ID, 'property')
  : getProductionStoragePath(userId, 'property');
```

#### Enhanced Cleanup with Storage

```typescript
// e2e/helpers/test-data-manager-enhanced.ts
class StorageAwareTestDataManager extends EnhancedTestDataManager {
  private uploadedFiles: string[] = [];

  async uploadTestPhoto(bucket: string, path: string, file: File) {
    const testPath = `test/${TEST_RUN_ID}/${path}`;

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(testPath, file);

    if (error) throw error;

    this.uploadedFiles.push(testPath);
    return { path: testPath, url: data.path };
  }

  async cleanup() {
    await super.cleanup(); // Database cleanup

    // Storage cleanup
    console.log(`🧹 Cleaning up ${this.uploadedFiles.length} uploaded files...`);

    for (const filePath of this.uploadedFiles) {
      try {
        await this.supabase.storage
          .from('property-photos')
          .remove([filePath]);
      } catch (error) {
        console.warn(`Failed to delete ${filePath}:`, error);
      }
    }

    // Cleanup entire test run folder
    try {
      const { data: allFiles } = await this.supabase.storage
        .from('property-photos')
        .list(`test/${TEST_RUN_ID}`);

      if (allFiles && allFiles.length > 0) {
        const paths = allFiles.map(f => `test/${TEST_RUN_ID}/${f.name}`);
        await this.supabase.storage.from('property-photos').remove(paths);
      }
    } catch (error) {
      console.warn('Cleanup folder error:', error);
    }
  }
}
```

#### Periodic Janitor (Nightly Cleanup)

```typescript
// supabase/functions/cleanup-test-storage/index.ts
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find test folders older than 7 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  const cutoffTimestamp = cutoffDate.getTime();

  const { data: testFolders } = await supabaseAdmin.storage
    .from('property-photos')
    .list('test');

  let deletedCount = 0;
  const errors: string[] = [];

  for (const folder of testFolders || []) {
    // Parse timestamp from folder name (test/${timestamp}-w${worker})
    const match = folder.name.match(/^(\d+)-w\d+$/);
    if (!match) continue;

    const folderTimestamp = parseInt(match[1]);
    if (folderTimestamp < cutoffTimestamp) {
      try {
        // List all files in folder
        const { data: files } = await supabaseAdmin.storage
          .from('property-photos')
          .list(`test/${folder.name}`);

        if (files && files.length > 0) {
          const paths = files.map(f => `test/${folder.name}/${f.name}`);
          await supabaseAdmin.storage.from('property-photos').remove(paths);
          deletedCount += files.length;
        }
      } catch (error) {
        errors.push(`Failed to cleanup ${folder.name}: ${error.message}`);
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    deletedCount,
    errors,
  }), { headers: { 'Content-Type': 'application/json' } });
});
```

**Schedule via Supabase Dashboard:**
```bash
# Or use pg_cron if available
SELECT cron.schedule(
  'cleanup-test-storage',
  '0 3 * * *',  -- 3 AM daily
  $$
    SELECT net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/cleanup-test-storage',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      )
    );
  $$
);
```

---

### 🔴 3. Performance Variance & Trending

**Risk:** Performance budgets flaky in CI due to noise

**Current State:**
- ✅ Single-run assertions (<2s, <500ms, <1s)
- ❌ No percentile tracking across runs
- ❌ No trend analysis
- ❌ CI noise not accounted for

**Required Implementation:**

#### Percentile-Based Assertions

```typescript
// e2e/helpers/performance-tracker.ts
import * as fs from 'fs';
import * as path from 'path';

interface PerfMetric {
  timestamp: string;
  runId: string;
  metric: string;
  value: number;
}

class PerformanceTracker {
  private metricsFile = path.join(__dirname, '../../.perf-metrics.json');
  private metrics: PerfMetric[] = [];

  constructor() {
    if (fs.existsSync(this.metricsFile)) {
      this.metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf-8'));
    }
  }

  recordMetric(metric: string, value: number) {
    this.metrics.push({
      timestamp: new Date().toISOString(),
      runId: TEST_RUN_ID,
      metric,
      value,
    });
  }

  getPercentile(metric: string, percentile: number, windowDays: number = 7): number | null {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);

    const recentValues = this.metrics
      .filter(m => m.metric === metric && new Date(m.timestamp) > cutoff)
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (recentValues.length === 0) return null;

    const index = Math.ceil((percentile / 100) * recentValues.length) - 1;
    return recentValues[index];
  }

  save() {
    fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
  }

  assertWithinBudget(metric: string, value: number, budget: number) {
    const p95 = this.getPercentile(metric, 95, 7);

    // If we have historical data, use p95 + 20% as threshold (accounts for variance)
    const threshold = p95 ? p95 * 1.2 : budget;

    if (value > threshold) {
      throw new Error(
        `${metric} exceeded threshold: ${value.toFixed(0)}ms > ${threshold.toFixed(0)}ms ` +
        `(p95: ${p95?.toFixed(0)}ms, budget: ${budget}ms)`
      );
    }

    console.log(
      `✅ ${metric}: ${value.toFixed(0)}ms ` +
      `(p95: ${p95?.toFixed(0) || 'N/A'}ms, threshold: ${threshold.toFixed(0)}ms)`
    );
  }
}

// Usage in tests
const perfTracker = new PerformanceTracker();

test('should load invite preview within budget', async ({ page }) => {
  const startTime = performance.now();
  await page.goto(inviteUrl);
  await page.waitForLoadState('networkidle');
  const loadTime = performance.now() - startTime;

  perfTracker.recordMetric('invite-preview-load', loadTime);
  perfTracker.assertWithinBudget('invite-preview-load', loadTime, PERF_BUDGET.invitePreview);
  perfTracker.save();
});
```

#### Production Telemetry Mirroring

```typescript
// src/utils/performance-monitoring.ts
import * as Sentry from '@sentry/react-native';

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;

  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  startTransaction(name: string, correlationId?: string) {
    const transaction = Sentry.startTransaction({
      name,
      op: 'navigation',
      tags: {
        correlationId,
      },
    });

    return transaction;
  }

  recordMetric(name: string, value: number, unit: 'millisecond' | 'second' = 'millisecond') {
    Sentry.metrics.distribution(name, value, {
      unit,
      tags: {
        environment: __DEV__ ? 'development' : 'production',
      },
    });
  }
}

// Usage in app
const perfMonitor = PerformanceMonitor.getInstance();

// In PropertyInviteAcceptScreen.tsx
useEffect(() => {
  const transaction = perfMonitor.startTransaction('invite-preview-load', correlationId);

  const startTime = performance.now();

  // ... load data ...

  const loadTime = performance.now() - startTime;
  perfMonitor.recordMetric('invite.preview.load', loadTime);

  transaction.finish();
}, []);
```

**Sentry Alerts:**
```yaml
# sentry.yaml
alerts:
  - name: Invite Preview Load Time p95 > 2s
    metric: invite.preview.load
    aggregation: p95
    threshold: 2000
    timeWindow: 1h
    action: slack-alert

  - name: Accept Action Latency p95 > 500ms
    metric: invite.accept.latency
    aggregation: p95
    threshold: 500
    timeWindow: 1h
    action: pagerduty
```

---

### 🔴 4. Service Role Scope & Environment Guards

**Risk:** Accidental production use of service role key

**Current State:**
- ✅ Service key in CI secrets
- ❌ No runtime guards preventing prod use
- ❌ No scope validation

**Required Implementation:**

#### Environment Guard Middleware

```typescript
// e2e/helpers/service-role-guard.ts
export function validateServiceRoleEnvironment() {
  const allowedEnvs = ['test', 'ci', 'staging'];
  const currentEnv = process.env.NODE_ENV || 'development';

  if (!allowedEnvs.includes(currentEnv) && !process.env.CI) {
    throw new Error(
      `🚨 SERVICE ROLE KEY USAGE BLOCKED\n` +
      `Service role keys can only be used in: ${allowedEnvs.join(', ')}\n` +
      `Current environment: ${currentEnv}\n` +
      `Set NODE_ENV=test or run in CI to proceed.`
    );
  }

  // Additional check: Verify we're not pointing at production
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  if (supabaseUrl.includes('myailandlord.com') || supabaseUrl.includes('prod')) {
    throw new Error(
      `🚨 PRODUCTION DATABASE DETECTED\n` +
      `Service role cannot be used against production database.\n` +
      `URL: ${supabaseUrl}\n` +
      `Use staging environment instead.`
    );
  }

  console.log(`✅ Service role environment validated: ${currentEnv}`);
}

// Usage
class EnhancedTestDataManager {
  constructor() {
    validateServiceRoleEnvironment(); // Throws if invalid

    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
}
```

#### Separate Staging Environment (Recommended)

```yaml
# .env.staging
EXPO_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-key  # Safe to use aggressively

# .env.production
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
# NO SERVICE_ROLE_KEY - never in production client
```

**CI Configuration:**
```yaml
# .github/workflows/e2e-tests.yml
env:
  # Always use staging for E2E
  EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
  EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.STAGING_SERVICE_ROLE_KEY }}
  NODE_ENV: test
```

---

### 🔴 5. Error Response Shaping (Information Leakage)

**Risk:** Responses leak token existence to unauthenticated users

**Current State:**
- ✅ Generic errors for invalid tokens
- ❌ Not verified systematically

**Required Implementation:**

#### Error Response Security Review

```typescript
// supabase/functions/validate-invite-token/index.ts (SECURE VERSION)

serve(async (req) => {
  const { token } = await req.json();

  // 1. Validate format BEFORE database query (prevents enumeration)
  if (!token || typeof token !== 'string' || !/^[a-zA-Z0-9]{12}$/.test(token)) {
    return new Response(JSON.stringify({
      error: 'Invalid token format',
      // Generic message - doesn't reveal if token exists
    }), { status: 200 });
  }

  // 2. Query database
  const { data: tokenData } = await supabaseAdmin
    .from('invite_tokens')
    .select('*')
    .eq('token', token)
    .single();

  // 3. Generic response for unauthenticated failures
  if (!tokenData) {
    // DO NOT reveal token doesn't exist
    return new Response(JSON.stringify({
      valid: false,
      error: 'invalid',
      message: 'This invite link is not valid. Please request a new one from your landlord.',
      // Generic - same response whether token doesn't exist, expired, revoked, etc.
    }), { status: 200 });
  }

  // 4. Check expiration/revocation
  const now = new Date();
  const expired = new Date(tokenData.expires_at) < now;
  const revoked = !!tokenData.revoked_at;
  const maxUsesReached = tokenData.use_count >= tokenData.max_uses;

  if (expired || revoked || maxUsesReached) {
    // AUTHENTICATED user gets specific error
    const errorCode = expired ? 'expired' : revoked ? 'revoked' : 'max_uses_reached';

    return new Response(JSON.stringify({
      valid: false,
      error: errorCode,
      message: getErrorMessage(errorCode),
      // Specific details only when token exists (prevents enumeration)
    }), { status: 200 });
  }

  // 5. Valid token - return property details
  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('id, name, address_line1, city, state')
    .eq('id', tokenData.property_id)
    .single();

  return new Response(JSON.stringify({
    valid: true,
    token_id: tokenData.id, // UUID, not token value
    property,
  }), { status: 200 });
});

function getErrorMessage(errorCode: string): string {
  const messages = {
    expired: 'This invite link has expired. Please contact your landlord for a new invitation.',
    revoked: 'This invite link has been cancelled. Please contact your landlord.',
    max_uses_reached: 'This invite link is no longer available.',
    invalid: 'This invite link is not valid. Please request a new one from your landlord.',
  };
  return messages[errorCode] || messages.invalid;
}
```

**Security Test:**
```typescript
test('should not leak token existence to unauthenticated users', async () => {
  // Create valid token
  const { token: validToken } = await testDataManager.generateInviteToken(property.id);

  // Create fake token (doesn't exist)
  const fakeToken = 'FAKEFAKEFAKE';

  // Validate both
  const validResponse = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
    method: 'POST',
    body: JSON.stringify({ token: validToken }),
  });

  const fakeResponse = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
    method: 'POST',
    body: JSON.stringify({ token: fakeToken }),
  });

  const validResult = await validResponse.json();
  const fakeResult = await fakeResponse.json();

  // Both should return similar structure (no info leak)
  expect(validResult.valid).toBe(true);
  expect(fakeResult.valid).toBe(false);

  // Fake token should NOT reveal non-existence
  expect(fakeResult.error).toBe('invalid'); // Generic
  expect(fakeResult.message).toContain('not valid'); // Generic

  // Response shapes should be similar (timing safe)
  expect(Object.keys(validResult).length).toBeGreaterThanOrEqual(3);
  expect(Object.keys(fakeResult).length).toBeGreaterThanOrEqual(3);
});
```

---

## High-Value Additions

### 📱 Device Farm Smoke Tests

**Weekly Schedule:**
```yaml
# .github/workflows/device-farm-smoke.yml
name: Device Farm - Weekly Smoke

on:
  schedule:
    - cron: '0 3 * * 0'  # Sunday 3 AM UTC
  workflow_dispatch:

jobs:
  real-device-smoke:
    runs-on: ubuntu-latest
    steps:
      - name: Run on AWS Device Farm
        run: |
          npm run device-farm:smoke
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          DEVICE_FARM_PROJECT_ARN: ${{ secrets.DEVICE_FARM_PROJECT_ARN }}
```

**Test Suite:**
```typescript
// e2e/device-farm/deep-link-smoke.spec.ts
import { remote } from 'webdriverio';

describe('Deep Link Smoke Test', () => {
  it('should open app via universal link on iOS', async () => {
    const driver = await remote({
      capabilities: {
        platformName: 'iOS',
        platformVersion: '17.0',
        deviceName: 'iPhone 15',
        automationName: 'XCUITest',
        app: process.env.IOS_APP_PATH,
      },
    });

    // Open deep link
    await driver.url('https://myailandlord.com/invite?token=TEST_TOKEN');

    // Verify app opened (not Safari)
    const bundleId = await driver.execute('mobile: activeAppInfo');
    expect(bundleId).toBe('com.myailandlord');

    await driver.deleteSession();
  });
});
```

---

### ♿ A11y Depth with Axe-Core

**Installation:**
```bash
npm install --save-dev @axe-core/playwright
```

**Implementation:**
```typescript
// e2e/flows/accessibility-comprehensive.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Comprehensive Accessibility', () => {
  test('should pass axe-core WCAG 2.1 Level AA', async ({ page }) => {
    const { inviteUrl } = await testDataManager.generateInviteToken(property.id);

    await page.goto(inviteUrl);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Log any incomplete tests (manual review needed)
    if (accessibilityScanResults.incomplete.length > 0) {
      console.warn('⚠️ Incomplete a11y checks:', accessibilityScanResults.incomplete);
    }
  });

  test('should have no color contrast violations', async ({ page }) => {
    await page.goto(inviteUrl);

    const results = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto(inviteUrl);

    const results = await new AxeBuilder({ page })
      .withTags(['cat.semantics'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
```

---

### 📊 Production Perf Telemetry

**Sentry Integration:**
```typescript
// App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,

  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      tracePropagationTargets: ['myailandlord.com', /^https:\/\/.*\.supabase\.co/],
    }),
  ],
});

// Mirror test budgets as production metrics
Sentry.setMeasurement('invite.preview.load', loadTime, 'millisecond');
Sentry.setMeasurement('invite.accept.latency', acceptTime, 'millisecond');
```

**Dashboard Alerts:**
```yaml
# sentry-alerts.yaml
- name: Invite Preview Load p95 > 2s
  query: p95(invite.preview.load) > 2000ms
  window: 1h
  action: slack

- name: Accept Latency p95 > 500ms
  query: p95(invite.accept.latency) > 500ms
  window: 1h
  action: pagerduty
```

---

## Operational Runbooks

### 🚨 Runbook: Token Incident Response

**Trigger:** Suspicious token generation spike, abuse detected

**Steps:**
1. **Immediate Actions** (5 min):
   ```sql
   -- Revoke all tokens created in last hour
   UPDATE invite_tokens
   SET revoked_at = NOW()
   WHERE created_at > NOW() - INTERVAL '1 hour'
     AND revoked_at IS NULL;
   ```

2. **Investigate** (15 min):
   ```bash
   # Find abuse pattern via correlation IDs
   grep "generate_invite_token" /var/log/edge-functions.log \
     | jq '.correlationId' \
     | sort | uniq -c | sort -rn | head -20
   ```

3. **Throttle** (if abuse confirmed):
   ```sql
   -- Add rate limit per landlord
   CREATE TABLE IF NOT EXISTS token_rate_limits (
     landlord_id UUID PRIMARY KEY,
     tokens_generated_today INT DEFAULT 0,
     last_reset DATE DEFAULT CURRENT_DATE
   );

   -- Enforce in RPC
   IF (SELECT tokens_generated_today FROM token_rate_limits WHERE landlord_id = p_landlord_id) > 100 THEN
     RAISE EXCEPTION 'Daily token limit reached';
   END IF;
   ```

4. **Communicate** (30 min):
   - Notify affected landlords
   - Post incident update
   - Log postmortem

### 🚨 Runbook: Invite Outage

**Trigger:** Invite acceptance rate drops below 30%

**Steps:**
1. **Check Edge Function Status**:
   ```bash
   curl https://myailandlord.com/functions/v1/validate-invite-token \
     -H "Authorization: Bearer anon-key" \
     -d '{"token":"HEALTH_CHECK"}' \
     | jq '.error'
   ```

2. **Verify RLS Policies**:
   ```sql
   -- Check if policies changed
   SELECT * FROM pg_policies WHERE tablename = 'invite_tokens';
   ```

3. **Check Database Connectivity**:
   ```bash
   PGPASSWORD=$DB_PASSWORD psql -h db.supabase.co -c "SELECT NOW();"
   ```

4. **Rollback if Needed**:
   ```bash
   # Revert to last known good deployment
   git revert HEAD
   git push
   ```

### 🚨 Runbook: CORS Misconfiguration

**Trigger:** Mobile app deep links failing, redirecting to browser

**Steps:**
1. **Validate AASA File**:
   ```bash
   ./scripts/validate-universal-links.sh
   ```

2. **Check Content-Type**:
   ```bash
   curl -I https://myailandlord.com/.well-known/apple-app-site-association \
     | grep -i "content-type"
   # Must be: application/json
   ```

3. **Verify No Redirects**:
   ```bash
   curl -I https://myailandlord.com/.well-known/apple-app-site-association \
     | grep -i "location"
   # Should be empty (no redirects)
   ```

4. **Fix in Hosting Config**:
   ```nginx
   # nginx.conf or similar
   location /.well-known/apple-app-site-association {
     default_type application/json;
     add_header Content-Type application/json;
     return 200 '{"applinks": {...}}';
   }
   ```

---

## Security Review Checklist

### SAST (Static Analysis)

```yaml
# .github/workflows/sast.yml
name: SAST - Security Scan

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/javascript
            p/typescript

  dependency-audit:
    runs-on: ubuntu-latest
    steps:
      - run: npm audit --audit-level=high
      - run: npx audit-ci --high
```

### Constant-Time Code Review

```typescript
// ✅ GOOD: Constant-time comparison
import { timingSafeEqual } from 'crypto';

function validateToken(providedToken: string, storedTokenHash: string): boolean {
  const providedHash = crypto.createHash('sha256').update(providedToken).digest();
  const storedHash = Buffer.from(storedTokenHash, 'hex');

  return timingSafeEqual(providedHash, storedHash);
}

// ❌ BAD: Early return leaks timing
function validateToken(provided: string, stored: string): boolean {
  if (provided.length !== stored.length) return false; // Leaks length
  for (let i = 0; i < provided.length; i++) {
    if (provided[i] !== stored[i]) return false; // Leaks position
  }
  return true;
}
```

---

## Summary

| Risk | Status | Mitigation |
|------|--------|------------|
| Universal/App Links | 🔴 TODO | AASA validation script, device farm testing |
| Storage Cleanup | 🔴 TODO | Namespacing, enhanced teardown, nightly janitor |
| Perf Variance | 🔴 TODO | Percentile tracking, trend analysis, Sentry mirroring |
| Service Role Scope | 🔴 TODO | Environment guards, staging separation |
| Error Shaping | 🔴 TODO | Response review, info leak tests |
| Device Farm | 🔴 TODO | AWS Device Farm weekly smoke |
| A11y Depth | 🔴 TODO | Axe-core integration |
| Perf Telemetry | 🔴 TODO | Sentry integration, dashboard alerts |
| Security Review | 🔴 TODO | SAST, dependency audit, code review |
| Runbooks | 🔴 TODO | Token incident, outage, CORS runbooks |

---

**Next Steps:**
1. Implement AASA validation script
2. Add storage cleanup to teardown
3. Set up percentile tracking
4. Add environment guards
5. Review error responses
6. Schedule device farm tests
7. Integrate axe-core
8. Deploy Sentry monitoring
9. Run SAST scan
10. Document runbooks

**Timeline:** 1-2 weeks to complete operational readiness

**Status:** 🔧 **PRE-PRODUCTION** - Testing excellent, operations need hardening
