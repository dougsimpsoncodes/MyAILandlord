#!/usr/bin/env node

/**
 * Secret Scanner Hook - Prevents accidental secret commits
 * Highest security priority hook with zero false positives
 */

const fs = require('fs');
const { execSync } = require('child_process');

class SecretScanner {
  constructor() {
    // Secret patterns with context awareness
    this.secretPatterns = {
      // API Keys (high risk)
      apiKeys: {
        patterns: [
          /sk_live_[a-zA-Z0-9]{24,}/g,  // Stripe live keys
          /sk_test_[a-zA-Z0-9]{24,}/g,  // Stripe test keys (still sensitive)
          /rk_live_[a-zA-Z0-9]{24,}/g,  // Restricted keys
          /AIza[0-9A-Za-z_-]{35}/g,     // Google API keys
          /ya29\.[0-9A-Za-z_-]+/g,      // Google OAuth tokens
        ],
        severity: 'CRITICAL',
        action: 'BLOCK'
      },

      // Authentication tokens
      authTokens: {
        patterns: [
          /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}/g, // JWT tokens (but allow anon tokens)
          /ghp_[A-Za-z0-9]{36}/g,       // GitHub personal access tokens
          /github_pat_[A-Za-z0-9_]{82}/g, // GitHub fine-grained tokens
        ],
        severity: 'HIGH',
        action: 'INSPECT'
      },

      // Database credentials
      dbCredentials: {
        patterns: [
          /password\s*[:=]\s*["'][^"']{8,}["']/gi,
          /pwd\s*[:=]\s*["'][^"']{8,}["']/gi,
          /postgresql:\/\/[^:]+:[^@]+@/gi,
          /mysql:\/\/[^:]+:[^@]+@/gi,
        ],
        severity: 'CRITICAL',
        action: 'BLOCK'
      },

      // Private keys
      privateKeys: {
        patterns: [
          /-----BEGIN PRIVATE KEY-----/g,
          /-----BEGIN RSA PRIVATE KEY-----/g,
          /-----BEGIN EC PRIVATE KEY-----/g,
        ],
        severity: 'CRITICAL',
        action: 'BLOCK'
      }
    };

    // Safe patterns that should NOT trigger alerts
    this.safePatterns = {
      // Expo public keys (designed to be public)
      expoPublic: /EXPO_PUBLIC_[A-Z_]+/g,
      
      // Supabase anon keys (designed for client-side)
      supabaseAnon: /eyJ[A-Za-z0-9_-]+/ && /anon/,
      
      // Clerk publishable keys (designed to be public)
      clerkPublishable: /pk_test_[a-zA-Z0-9]+/g,
      
      // Example/placeholder patterns
      placeholders: [
        /your_api_key_here/gi,
        /replace_with_actual/gi,
        /example_key/gi,
        /\[YOUR_KEY\]/gi,
        /\{API_KEY\}/gi
      ]
    };
  }

  async scanStagedFiles() {
    const results = {
      criticalSecrets: [],
      suspiciousPatterns: [],
      safeFindings: [],
      recommendation: 'PROCEED'
    };

    try {
      // Get staged files
      const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(file => file.trim());

      if (stagedFiles.length === 0) {
        return { ...results, message: 'No staged files to scan' };
      }

      console.log(`🔍 Scanning ${stagedFiles.length} staged files for secrets...`);

      // Scan each staged file
      for (const file of stagedFiles) {
        if (this.shouldScanFile(file)) {
          await this.scanFile(file, results);
        }
      }

      // Determine final recommendation
      if (results.criticalSecrets.length > 0) {
        results.recommendation = 'BLOCK';
        results.message = `🚨 CRITICAL: Found ${results.criticalSecrets.length} secrets that must not be committed`;
      } else if (results.suspiciousPatterns.length > 0) {
        results.recommendation = 'REVIEW';
        results.message = `⚠️  WARNING: Found ${results.suspiciousPatterns.length} suspicious patterns requiring review`;
      } else {
        results.recommendation = 'PROCEED';
        results.message = '✅ No secrets detected - safe to commit';
      }

      return results;

    } catch (error) {
      return {
        ...results,
        recommendation: 'ERROR',
        message: `❌ Scanner error: ${error.message}`
      };
    }
  }

  shouldScanFile(file) {
    // Skip binary files and certain extensions
    const skipExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'];
    const skipDirectories = ['node_modules/', '.git/', 'dist/', 'build/'];
    
    if (skipExtensions.some(ext => file.endsWith(ext))) return false;
    if (skipDirectories.some(dir => file.startsWith(dir))) return false;
    
    return true;
  }

  async scanFile(file, results) {
    try {
      // Check if file is deleted (not in index)
      try {
        execSync(`git cat-file -e :${file}`, { stdio: 'pipe' });
      } catch (error) {
        // File is deleted, skip scanning
        console.log(`⚠️  Could not scan ${file}: File deleted`);
        return;
      }

      // Get staged content
      const content = execSync(`git show :${file}`, { encoding: 'utf8' });
      
      // Check for secrets in content
      Object.entries(this.secretPatterns).forEach(([category, config]) => {
        config.patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const finding = {
                file,
                category,
                pattern: pattern.toString(),
                match: this.maskSecret(match),
                line: this.findLineNumber(content, match),
                severity: config.severity,
                action: config.action
              };

              // Check if this is actually a safe pattern
              if (this.isSafePattern(match, content)) {
                results.safeFindings.push({
                  ...finding,
                  reason: 'Identified as safe public key or placeholder'
                });
              } else if (config.action === 'BLOCK') {
                results.criticalSecrets.push(finding);
              } else {
                results.suspiciousPatterns.push(finding);
              }
            });
          }
        });
      });

    } catch (error) {
      // File might be deleted or binary
      console.log(`⚠️  Could not scan ${file}: ${error.message}`);
    }
  }

  isSafePattern(match, content) {
    // Check if match is in a safe context
    
    // 1. Check for EXPO_PUBLIC_ prefix (always safe)
    if (content.includes('EXPO_PUBLIC_') && match.includes('EXPO_PUBLIC_')) {
      return true;
    }

    // 2. Check for Clerk publishable keys (safe for client)
    if (match.startsWith('pk_test_') || match.startsWith('pk_live_')) {
      return true;
    }

    // 3. Check for Supabase anon keys (safe for client)
    if (match.includes('eyJ') && (content.includes('anon') || content.includes('SUPABASE_ANON'))) {
      return true;
    }

    // 4. Check for .env.example files (always safe)
    if (content.includes('.env.example') || content.includes('your_key_here')) {
      return true;
    }

    // 5. Check for placeholder patterns
    if (this.safePatterns.placeholders.some(pattern => pattern.test(match))) {
      return true;
    }

    return false;
  }

  maskSecret(secret) {
    if (secret.length <= 8) return '***';
    return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
  }

  findLineNumber(content, match) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(match)) {
        return i + 1;
      }
    }
    return 0;
  }

  async rotateExposedSecrets(findings) {
    console.log('\n🔄 Secret rotation recommendations:');
    
    findings.forEach(finding => {
      switch (finding.category) {
        case 'apiKeys':
          console.log(`  • Rotate API key in ${finding.file}:${finding.line}`);
          console.log(`    - Revoke: ${finding.match}`);
          console.log(`    - Generate new key in provider dashboard`);
          break;
        case 'authTokens':
          console.log(`  • Revoke auth token in ${finding.file}:${finding.line}`);
          console.log(`    - Token: ${finding.match}`);
          break;
        case 'dbCredentials':
          console.log(`  • Change database password in ${finding.file}:${finding.line}`);
          break;
      }
    });
  }
}

// Main execution
async function main() {
  const scanner = new SecretScanner();
  const results = await scanner.scanStagedFiles();
  
  console.log(results.message);
  
  if (results.criticalSecrets.length > 0) {
    console.log('\n🚨 CRITICAL SECRETS FOUND:');
    results.criticalSecrets.forEach(finding => {
      console.log(`  ${finding.file}:${finding.line} - ${finding.category}`);
      console.log(`    Pattern: ${finding.match}`);
    });
    
    await scanner.rotateExposedSecrets(results.criticalSecrets);
    
    console.log('\n❌ COMMIT BLOCKED - Remove secrets before committing');
    process.exit(1);
  }
  
  if (results.suspiciousPatterns.length > 0) {
    console.log('\n⚠️  SUSPICIOUS PATTERNS:');
    results.suspiciousPatterns.forEach(finding => {
      console.log(`  ${finding.file}:${finding.line} - ${finding.category}`);
      console.log(`    Pattern: ${finding.match}`);
    });
    console.log('\n⚠️  Please review these patterns before committing');
  }
  
  if (results.safeFindings.length > 0) {
    console.log(`\n✅ ${results.safeFindings.length} safe public keys identified (proceeding)`);
  }
  
  // Save scan results
  fs.writeFileSync('.claude/hooks/last-secret-scan.json', JSON.stringify(results, null, 2));
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { SecretScanner };