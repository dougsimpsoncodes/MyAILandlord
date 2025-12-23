#!/usr/bin/env ts-node
/**
 * Invite Flow Testing Script
 * Tests token generation, validation, and acceptance flow
 *
 * Usage:
 *   npm run test:invite          # Run all tests
 *   npm run test:invite quality  # Token quality tests only
 *   npm run test:invite security # Security tests only
 *   npm run test:invite flow     # Click-through flow tests only
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// ============================================================
// Configuration
// ============================================================

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';

// Test user credentials
const TEST_LANDLORD = {
  email: `test-landlord-${Date.now()}@myailandlord.com`,
  password: 'TestLandlord123!',
  firstName: 'Test',
};

const TEST_TENANT = {
  email: `test-tenant-${Date.now()}@myailandlord.com`,
  password: 'TestTenant123!',
  firstName: 'Tenant',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// ============================================================
// Helper Functions
// ============================================================

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step: string) {
  log(`\n🔷 ${step}`, 'blue');
}

function logSuccess(message: string) {
  log(`  ✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`  ❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`  ⚠️  ${message}`, 'yellow');
}

function logInfo(message: string) {
  log(`  ℹ️  ${message}`, 'cyan');
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============================================================
// Test Suite Classes
// ============================================================

class TestResults {
  passed = 0;
  failed = 0;
  warnings = 0;
  tests: Array<{ name: string; status: 'pass' | 'fail' | 'warn'; message?: string }> = [];

  addTest(name: string, passed: boolean, message?: string) {
    if (passed) {
      this.passed++;
      this.tests.push({ name, status: 'pass' });
      logSuccess(name);
    } else {
      this.failed++;
      this.tests.push({ name, status: 'fail', message });
      logError(`${name}${message ? `: ${message}` : ''}`);
    }
  }

  addWarning(name: string, message: string) {
    this.warnings++;
    this.tests.push({ name, status: 'warn', message });
    logWarning(`${name}: ${message}`);
  }

  summary() {
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Total Tests: ${this.passed + this.failed}`, 'cyan');
    logSuccess(`Passed: ${this.passed}`);
    if (this.failed > 0) logError(`Failed: ${this.failed}`);
    if (this.warnings > 0) logWarning(`Warnings: ${this.warnings}`);
    log('='.repeat(60) + '\n', 'cyan');

    if (this.failed > 0) {
      log('\n❌ FAILED TESTS:', 'red');
      this.tests
        .filter(t => t.status === 'fail')
        .forEach(t => log(`  - ${t.name}${t.message ? `: ${t.message}` : ''}`, 'red'));
    }

    return this.failed === 0;
  }
}

// ============================================================
// Test Suite: Token Quality
// ============================================================

class TokenQualityTests {
  private supabase: ReturnType<typeof createClient> | null = null;
  private results = new TestResults();

  constructor() {
    if (SUPABASE_SERVICE_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
  }

  async run(): Promise<boolean> {
    log('\n🧪 PHASE 1: TOKEN QUALITY TESTS', 'cyan');
    log('='.repeat(60), 'cyan');

    if (!this.supabase) {
      logWarning('Skipping Token Quality Tests - SUPABASE_SERVICE_ROLE_KEY not set');
      return true; // Skip tests, don't fail
    }

    await this.testTokenFormat();
    await this.testTokenUniqueness();
    await this.testTokenMetadata();
    await this.testExpirationCalculation();

    return this.results.summary();
  }

  private async testTokenFormat() {
    logStep('Test 1.1: Token Format Validation');

    try {
      // Generate sample token
      const testPropertyId = '00000000-0000-0000-0000-000000000000';

      logInfo('Generating sample token...');
      const { data, error } = await this.supabase.rpc('generate_invite_token', {
        p_property_id: testPropertyId,
        p_max_uses: 1,
        p_expires_in_days: 7,
      });

      if (error) {
        this.results.addTest('Generate token', false, error.message);
        return;
      }

      const token = data?.token;

      // Test 1: Length is exactly 12 characters
      this.results.addTest(
        'Token length is 12 characters',
        token?.length === 12,
        `Got ${token?.length} chars`
      );

      // Test 2: Base62 charset (alphanumeric only)
      const base62Regex = /^[a-zA-Z0-9]{12}$/;
      this.results.addTest(
        'Token uses base62 charset (a-zA-Z0-9)',
        base62Regex.test(token),
        `Token: ${token}`
      );

      // Test 3: URL-safe (no special encoding needed)
      const encoded = encodeURIComponent(token);
      this.results.addTest(
        'Token is URL-safe (no encoding needed)',
        encoded === token,
        `Encoded: ${encoded}`
      );

      // Test 4: No ambiguous characters (optional, depends on implementation)
      const ambiguousChars = /[0Oo1Il]/;
      if (ambiguousChars.test(token)) {
        this.results.addWarning(
          'Token contains potentially ambiguous characters',
          `Token: ${token}`
        );
      } else {
        logInfo('✓ No ambiguous characters detected');
      }

      logInfo(`Sample token: ${token}`);

      // Cleanup
      await this.supabase.from('invite_tokens').delete().eq('token', token);
    } catch (error) {
      this.results.addTest('Token format validation', false, (error as Error).message);
    }
  }

  private async testTokenUniqueness() {
    logStep('Test 1.2: Token Uniqueness (100 samples)');

    try {
      const tokens: string[] = [];
      const testPropertyId = '00000000-0000-0000-0000-000000000000';
      const sampleSize = 100;

      logInfo(`Generating ${sampleSize} tokens...`);

      for (let i = 0; i < sampleSize; i++) {
        const { data } = await this.supabase.rpc('generate_invite_token', {
          p_property_id: testPropertyId,
          p_max_uses: 1,
          p_expires_in_days: 7,
        });

        if (data?.token) {
          tokens.push(data.token);
        }

        if ((i + 1) % 20 === 0) {
          logInfo(`  Generated ${i + 1}/${sampleSize}...`);
        }
      }

      // Check for duplicates
      const uniqueTokens = new Set(tokens);
      const duplicates = tokens.length - uniqueTokens.size;

      this.results.addTest(
        `All ${sampleSize} tokens are unique`,
        duplicates === 0,
        `Found ${duplicates} duplicates`
      );

      logInfo(`Generated tokens: ${tokens.length}, Unique: ${uniqueTokens.size}`);

      // Cleanup
      await this.supabase.from('invite_tokens').delete().in('token', tokens);
    } catch (error) {
      this.results.addTest('Token uniqueness', false, (error as Error).message);
    }
  }

  private async testTokenMetadata() {
    logStep('Test 1.3: Token Metadata Accuracy');

    try {
      const testPropertyId = '00000000-0000-0000-0000-000000000000';
      const beforeGeneration = new Date();

      const { data: rpcData } = await this.supabase.rpc('generate_invite_token', {
        p_property_id: testPropertyId,
        p_max_uses: 1,
        p_expires_in_days: 7,
      });

      const afterGeneration = new Date();
      const token = rpcData?.token;

      // Query database for full token record
      const { data: tokenRecord } = await this.supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', token)
        .single();

      // Test 1: Property ID matches
      this.results.addTest(
        'property_id matches',
        tokenRecord?.property_id === testPropertyId
      );

      // Test 2: created_by is set (should be auth.uid() from RPC)
      this.results.addTest('created_by is set', !!tokenRecord?.created_by);

      // Test 3: max_uses is 1
      this.results.addTest('max_uses is 1', tokenRecord?.max_uses === 1);

      // Test 4: use_count starts at 0
      this.results.addTest('use_count is 0', tokenRecord?.use_count === 0);

      // Test 5: revoked_at is NULL
      this.results.addTest('revoked_at is NULL', tokenRecord?.revoked_at === null);

      // Test 6: expires_at is approximately 7 days from now
      const expiresAt = new Date(tokenRecord?.expires_at);
      const expectedExpiration = new Date(beforeGeneration);
      expectedExpiration.setDate(expectedExpiration.getDate() + 7);

      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiration.getTime());
      const minutesDiff = timeDiff / (1000 * 60);

      this.results.addTest(
        'expires_at is ~7 days from creation',
        minutesDiff < 5, // Within 5 minutes tolerance
        `Difference: ${minutesDiff.toFixed(2)} minutes`
      );

      logInfo(`Token metadata: ${JSON.stringify(tokenRecord, null, 2)}`);

      // Cleanup
      await this.supabase.from('invite_tokens').delete().eq('token', token);
    } catch (error) {
      this.results.addTest('Token metadata', false, (error as Error).message);
    }
  }

  private async testExpirationCalculation() {
    logStep('Test 1.4: Expiration Date Calculation');

    try {
      const testPropertyId = '00000000-0000-0000-0000-000000000000';
      const expirationDays = [1, 7, 14, 30];

      for (const days of expirationDays) {
        const beforeGeneration = new Date();

        const { data } = await this.supabase.rpc('generate_invite_token', {
          p_property_id: testPropertyId,
          p_max_uses: 1,
          p_expires_in_days: days,
        });

        const { data: tokenRecord } = await this.supabase
          .from('invite_tokens')
          .select('expires_at')
          .eq('token', data?.token)
          .single();

        const expiresAt = new Date(tokenRecord?.expires_at);
        const expectedExpiration = new Date(beforeGeneration);
        expectedExpiration.setDate(expectedExpiration.getDate() + days);

        const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiration.getTime());
        const minutesDiff = timeDiff / (1000 * 60);

        this.results.addTest(
          `Expiration calculation for ${days} days`,
          minutesDiff < 5,
          `Difference: ${minutesDiff.toFixed(2)} minutes`
        );

        // Cleanup
        await this.supabase.from('invite_tokens').delete().eq('token', data?.token);
      }
    } catch (error) {
      this.results.addTest('Expiration calculation', false, (error as Error).message);
    }
  }
}

// ============================================================
// Test Suite: Token Validation
// ============================================================

class TokenValidationTests {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  private adminSupabase: ReturnType<typeof createClient> | null = null;
  private results = new TestResults();

  constructor() {
    if (SUPABASE_SERVICE_KEY) {
      this.adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
  }

  async run(): Promise<boolean> {
    log('\n🧪 PHASE 2: TOKEN VALIDATION TESTS', 'cyan');
    log('='.repeat(60), 'cyan');

    await this.testExpiredToken();
    await this.testRevokedToken();
    await this.testInvalidToken();
    await this.testMissingToken();

    return this.results.summary();
  }

  private async testExpiredToken() {
    logStep('Test 2.1: Expired Token Handling');

    if (!this.adminSupabase) {
      logWarning('Skipping - requires SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    try {
      const testPropertyId = '00000000-0000-0000-0000-000000000000';

      // Generate token
      const { data: rpcData } = await this.adminSupabase.rpc('generate_invite_token', {
        p_property_id: testPropertyId,
        p_max_uses: 1,
        p_expires_in_days: 7,
      });

      const token = rpcData?.token;

      // Manually expire the token
      await this.adminSupabase
        .from('invite_tokens')
        .update({ expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }) // 1 day ago
        .eq('token', token);

      // Try to validate expired token
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      this.results.addTest(
        'Expired token returns valid=false',
        result.valid === false
      );

      this.results.addTest(
        'Error code is "expired"',
        result.error === 'expired'
      );

      this.results.addTest(
        'User-friendly error message provided',
        !!result.message && result.message.includes('expired')
      );

      logInfo(`Validation response: ${JSON.stringify(result, null, 2)}`);

      // Cleanup
      await this.adminSupabase.from('invite_tokens').delete().eq('token', token);
    } catch (error) {
      this.results.addTest('Expired token handling', false, (error as Error).message);
    }
  }

  private async testRevokedToken() {
    logStep('Test 2.2: Revoked Token Handling');

    if (!this.adminSupabase) {
      logWarning('Skipping - requires SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    try {
      const testPropertyId = '00000000-0000-0000-0000-000000000000';

      // Generate token
      const { data: rpcData } = await this.adminSupabase.rpc('generate_invite_token', {
        p_property_id: testPropertyId,
        p_max_uses: 1,
        p_expires_in_days: 7,
      });

      const token = rpcData?.token;

      // Revoke the token
      await this.adminSupabase
        .from('invite_tokens')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: '00000000-0000-0000-0000-000000000000'
        })
        .eq('token', token);

      // Try to validate revoked token
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      this.results.addTest(
        'Revoked token returns valid=false',
        result.valid === false
      );

      this.results.addTest(
        'Error code is "revoked"',
        result.error === 'revoked'
      );

      logInfo(`Validation response: ${JSON.stringify(result, null, 2)}`);

      // Cleanup
      await this.adminSupabase.from('invite_tokens').delete().eq('token', token);
    } catch (error) {
      this.results.addTest('Revoked token handling', false, (error as Error).message);
    }
  }

  private async testInvalidToken() {
    logStep('Test 2.3: Invalid Token Handling');

    const invalidTokens = [
      { token: 'short', description: 'Too short (5 chars)' },
      { token: 'waytoolongtoken123', description: 'Too long (18 chars)' },
      { token: 'invalid!@#$%', description: 'Special characters' },
      { token: 'ZZZZZZZZZZZZ', description: 'Non-existent token' },
    ];

    for (const { token, description } of invalidTokens) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        this.results.addTest(
          `Invalid token (${description}) returns valid=false`,
          result.valid === false || !!result.error
        );

        logInfo(`  ${description}: ${JSON.stringify(result)}`);
      } catch (error) {
        this.results.addTest(`Invalid token (${description})`, false, (error as Error).message);
      }
    }
  }

  private async testMissingToken() {
    logStep('Test 2.4: Missing Token Parameter');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({}), // No token parameter
      });

      const result = await response.json();

      this.results.addTest(
        'Missing token returns valid=false or error',
        result.valid === false || result.error
      );

      logInfo(`Response: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      this.results.addTest('Missing token handling', false, (error as Error).message);
    }
  }
}

// ============================================================
// Test Suite: Security
// ============================================================

class SecurityTests {
  private adminSupabase: ReturnType<typeof createClient> | null = null;
  private results = new TestResults();

  constructor() {
    if (SUPABASE_SERVICE_KEY) {
      this.adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    }
  }

  async run(): Promise<boolean> {
    log('\n🧪 PHASE 3: SECURITY TESTS', 'cyan');
    log('='.repeat(60), 'cyan');

    if (!this.adminSupabase) {
      logWarning('Skipping Security Tests - SUPABASE_SERVICE_ROLE_KEY not set');
      return true; // Skip tests, don't fail
    }

    await this.testTokenEnumerationPrevention();
    await this.testRLSPolicyEnforcement();
    await this.testTokenNotLogged();

    return this.results.summary();
  }

  private async testTokenEnumerationPrevention() {
    logStep('Test 3.1: Token Enumeration Prevention');

    try {
      const randomTokens = Array.from({ length: 10 }, () =>
        Array.from({ length: 12 }, () =>
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
            Math.floor(Math.random() * 62)
          ]
        ).join('')
      );

      logInfo(`Testing ${randomTokens.length} random tokens...`);

      const responseTimes: number[] = [];

      for (const token of randomTokens) {
        const start = Date.now();
        const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token }),
        });

        const end = Date.now();
        responseTimes.push(end - start);

        const result = await response.json();

        if (result.valid === true) {
          this.results.addTest(
            `Random token should not be valid`,
            false,
            `Token ${token} was valid!`
          );
          return;
        }
      }

      this.results.addTest(
        'All random tokens rejected',
        true
      );

      // Check for timing consistency
      const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const stdDev = Math.sqrt(
        responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
          responseTimes.length
      );

      this.results.addTest(
        'Response times consistent (no timing leaks)',
        stdDev < 100, // Less than 100ms standard deviation
        `Avg: ${avgTime.toFixed(0)}ms, StdDev: ${stdDev.toFixed(0)}ms`
      );

      logInfo(`Response times - Avg: ${avgTime.toFixed(0)}ms, StdDev: ${stdDev.toFixed(0)}ms`);
    } catch (error) {
      this.results.addTest('Token enumeration prevention', false, (error as Error).message);
    }
  }

  private async testRLSPolicyEnforcement() {
    logStep('Test 3.2: RLS Policy Enforcement');

    try {
      // Try to query invite_tokens table with anon key (should be blocked)
      const anonSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data, error } = await anonSupabase.from('invite_tokens').select('*');

      this.results.addTest(
        'Anonymous user cannot query invite_tokens directly',
        data === null || (Array.isArray(data) && data.length === 0),
        error ? error.message : 'Data returned when it should be blocked'
      );

      logInfo(`RLS enforcement: ${error ? 'Blocked ✓' : 'FAILED - data returned'}`);
    } catch (error) {
      this.results.addTest('RLS policy enforcement', false, (error as Error).message);
    }
  }

  private async testTokenNotLogged() {
    logStep('Test 3.3: Token Values Not Logged');

    // This is a manual verification step
    logWarning('Manual verification required:');
    logInfo('1. Check server logs for token values (should only see token_id UUIDs)');
    logInfo('2. Verify no tokens in client-side console.log statements');
    logInfo('3. Check error tracking (Sentry) for token exposure');

    this.results.addWarning(
      'Token logging verification',
      'Manual check required - review logs and error tracking'
    );
  }
}

// ============================================================
// Test Suite: Manual Flow Tests
// ============================================================

class ManualFlowTests {
  private adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  private results = new TestResults();

  async run(): Promise<boolean> {
    log('\n🧪 PHASE 4: MANUAL FLOW TESTS', 'cyan');
    log('='.repeat(60), 'cyan');

    await this.generateTestInvite();

    return this.results.summary();
  }

  private async generateTestInvite() {
    logStep('Manual Test: Click-Through Flow');

    try {
      // Generate a real invite token
      const testPropertyId = '00000000-0000-0000-0000-000000000000';

      logInfo('Generating test invite token...');

      const { data, error } = await this.adminSupabase.rpc('generate_invite_token', {
        p_property_id: testPropertyId,
        p_max_uses: 5, // Multi-use for testing
        p_expires_in_days: 1, // 1 day expiry
      });

      if (error) {
        this.results.addTest('Generate test invite', false, error.message);
        return;
      }

      const token = data?.token;
      const inviteUrl = `${BASE_URL}/invite?token=${token}`;

      log('\n' + '='.repeat(60), 'green');
      log('🎟️  TEST INVITE GENERATED', 'green');
      log('='.repeat(60), 'green');
      log(`\nInvite URL: ${inviteUrl}`, 'cyan');
      log(`\nToken: ${token}`, 'gray');
      log(`Expires: ${new Date(data.expires_at).toLocaleString()}`, 'gray');
      log(`Max Uses: ${data.max_uses}`, 'gray');
      log('='.repeat(60) + '\n', 'green');

      log('\n📋 MANUAL TESTING CHECKLIST:', 'yellow');
      log('  1. Open invite URL in browser (incognito mode)', 'yellow');
      log('  2. Verify property details display correctly', 'yellow');
      log('  3. Click "Accept Invitation" button', 'yellow');
      log('  4. Complete sign-up if needed', 'yellow');
      log('  5. Verify redirect to property details', 'yellow');
      log('  6. Check property appears in tenant dashboard', 'yellow');

      const proceed = await promptUser('\nPress ENTER to continue or Ctrl+C to exit...');

      // Store token for potential cleanup
      logInfo(`Token ${token} left in database for manual testing`);
      logInfo('Run cleanup script after testing to remove test data');

      this.results.addTest('Test invite generated for manual testing', true);
    } catch (error) {
      this.results.addTest('Generate test invite', false, (error as Error).message);
    }
  }
}

// ============================================================
// Main Test Runner
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const testSuite = args[0] || 'all';

  log('\n🚀 INVITE FLOW TEST SUITE', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`Environment: ${BASE_URL}`, 'gray');
  log(`Test Suite: ${testSuite}`, 'gray');
  log('='.repeat(60) + '\n', 'cyan');

  // Verify environment
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logError('Missing Supabase credentials in environment variables');
    logInfo('Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_KEY) {
    logWarning('SUPABASE_SERVICE_ROLE_KEY not set - some tests will be skipped');
  }

  let allTestsPassed = true;

  // Run test suites based on argument
  if (testSuite === 'all' || testSuite === 'quality') {
    const qualityTests = new TokenQualityTests();
    const passed = await qualityTests.run();
    allTestsPassed = allTestsPassed && passed;
  }

  if (testSuite === 'all' || testSuite === 'validation') {
    const validationTests = new TokenValidationTests();
    const passed = await validationTests.run();
    allTestsPassed = allTestsPassed && passed;
  }

  if (testSuite === 'all' || testSuite === 'security') {
    const securityTests = new SecurityTests();
    const passed = await securityTests.run();
    allTestsPassed = allTestsPassed && passed;
  }

  if (testSuite === 'flow') {
    const flowTests = new ManualFlowTests();
    const passed = await flowTests.run();
    allTestsPassed = allTestsPassed && passed;
  }

  // Final summary
  log('\n' + '='.repeat(60), 'cyan');
  if (allTestsPassed) {
    log('✅ ALL TESTS PASSED', 'green');
  } else {
    log('❌ SOME TESTS FAILED', 'red');
  }
  log('='.repeat(60) + '\n', 'cyan');

  process.exit(allTestsPassed ? 0 : 1);
}

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

export { TokenQualityTests, TokenValidationTests, SecurityTests, ManualFlowTests };
