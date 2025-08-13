#!/usr/bin/env node
/**
 * World-Class Security Audit for SQL RLS and Storage Policies
 * Scans staged SQL files for RLS/Storage policies and enforces user context validation
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔒 Running Security Audit...');

const sqlFiles = execSync(
  "git diff --cached --name-only --diff-filter=ACM | grep -E '\\.sql$' || true",
  { encoding: 'utf8' }
)
  .split('\n')
  .filter(f => f.trim());

if (sqlFiles.length === 0) {
  console.log('✅ No SQL files staged for commit. Skipping RLS validation.');
  process.exit(0);
}

let fail = false;
const missing = [];
const contextRegex = /current_setting\('app\.current_user_id'|auth\.uid\s*\(/i;

function checkPolicy(file, name, block) {
  if (!contextRegex.test(block)) {
    fail = true;
    missing.push(`${file}: "${name}" - Missing user context validation`);
  }
}

for (const file of sqlFiles) {
  const content = fs.readFileSync(file, 'utf8');

  const policies = content
    .split(/CREATE POLICY/i)
    .slice(1)
    .map(p => 'CREATE POLICY' + p);

  for (const policy of policies) {
    const nameMatch = policy.match(/"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : '(unknown name)';

    // Always check for user context
    checkPolicy(file, name, policy);

    // Extra check for storage.objects non-public buckets
    if (/storage\.objects/i.test(policy) && !/public/i.test(policy)) {
      checkPolicy(file, name, policy);
    }
  }
}

if (fail) {
  console.error('\n❌ CRITICAL: Missing user context in these policies:');
  missing.forEach(mp => console.error(`   - ${mp}`));
  console.error(
    '\n💡 Ensure every USING and WITH CHECK includes either:\n' +
    "   current_setting('app.current_user_id', true)\n" +
    '  or\n' +
    '   auth.uid()\n'
  );
  process.exit(1);
}

console.log('✅ All RLS and storage policies include user context validation.');
process.exit(0);

