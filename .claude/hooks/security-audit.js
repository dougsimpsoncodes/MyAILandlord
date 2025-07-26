#!/usr/bin/env node

/**
 * Security Audit Hook - Comprehensive security validation before push
 * Ensures no vulnerabilities enter main branch
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor() {
    this.auditChecks = {
      npmVulnerabilities: {
        name: 'NPM Vulnerability Scan',
        command: 'npm audit --audit-level=high --json',
        weight: 10,
        critical: true
      },
      rlsPolicies: {
        name: 'RLS Policy Validation',
        custom: true,
        weight: 9,
        critical: true
      },
      environmentSecurity: {
        name: 'Environment Security Check',
        custom: true,
        weight: 8,
        critical: true
      },
      authenticationFlow: {
        name: 'Authentication Flow Security',
        custom: true,
        weight: 7,
        critical: false
      },
      inputValidation: {
        name: 'Input Validation Coverage',
        custom: true,
        weight: 6,
        critical: false
      },
      securityHeaders: {
        name: 'Security Headers Check',
        custom: true,
        weight: 5,
        critical: false
      }
    };

    this.results = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      passed: [],
      score: 0
    };
  }

  async runSecurityAudit() {
    console.log('🔒 Running Comprehensive Security Audit...');
    
    const branch = this.getCurrentBranch();
    console.log(`🌿 Auditing branch: ${branch}`);

    // Run all security checks
    for (const [checkName, config] of Object.entries(this.auditChecks)) {
      await this.runSecurityCheck(checkName, config);
    }

    return this.generateSecurityReport();
  }

  getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  async runSecurityCheck(checkName, config) {
    try {
      console.log(`  🔍 ${config.name}...`);

      let result;
      if (config.custom) {
        result = await this.runCustomSecurityCheck(checkName);
      } else {
        result = await this.runCommandSecurityCheck(config);
      }

      this.categorizeResult(checkName, config, result);

    } catch (error) {
      this.results.critical.push({
        check: checkName,
        name: config.name,
        error: error.message,
        impact: 'Security check failed to execute'
      });
    }
  }

  async runCommandSecurityCheck(config) {
    try {
      const output = execSync(config.command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (config.name === 'NPM Vulnerability Scan') {
        const auditResult = JSON.parse(output);
        return this.parseNpmAudit(auditResult);
      }

      return { passed: true, message: `${config.name} passed` };
    } catch (error) {
      if (config.name === 'NPM Vulnerability Scan' && error.stdout) {
        try {
          const auditResult = JSON.parse(error.stdout);
          return this.parseNpmAudit(auditResult);
        } catch {
          // Fall through to error case
        }
      }
      throw error;
    }
  }

  parseNpmAudit(auditResult) {
    const vulnerabilities = auditResult.vulnerabilities || {};
    const summary = auditResult.metadata?.vulnerabilities || {};
    
    const issues = Object.entries(vulnerabilities).map(([pkg, vuln]) => ({
      package: pkg,
      severity: vuln.severity,
      title: vuln.title,
      url: vuln.url,
      via: vuln.via
    }));

    return {
      passed: summary.high === 0 && summary.critical === 0,
      vulnerabilities: issues,
      summary: summary,
      message: `Found ${summary.total || 0} vulnerabilities (${summary.critical || 0} critical, ${summary.high || 0} high)`
    };
  }

  async runCustomSecurityCheck(checkName) {
    switch (checkName) {
      case 'rlsPolicies':
        return this.checkRLSPolicies();
      case 'environmentSecurity':
        return this.checkEnvironmentSecurity();
      case 'authenticationFlow':
        return this.checkAuthenticationFlow();
      case 'inputValidation':
        return this.checkInputValidation();
      case 'securityHeaders':
        return this.checkSecurityHeaders();
      default:
        return { passed: true, message: 'Custom check not implemented' };
    }
  }

  async checkRLSPolicies() {
    // Check if RLS policies are properly implemented
    const issues = [];
    
    // 1. Check if SQL files exist
    const sqlFiles = [
      'supabase-rls-policies.sql',
      'supabase-storage-setup.sql'
    ];

    sqlFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        issues.push(`Missing RLS policy file: ${file}`);
      } else {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for essential RLS elements
        if (!content.includes('ROW LEVEL SECURITY')) {
          issues.push(`${file}: Missing ROW LEVEL SECURITY statements`);
        }
        if (!content.includes('set_current_user_id')) {
          issues.push(`${file}: Missing user context function`);
        }
        if (!content.includes('current_setting(\'app.current_user_id\')')) {
          issues.push(`${file}: Missing user context validation`);
        }
      }
    });

    // 2. Check API client uses withUserContext
    const apiFiles = ['src/services/api/client.ts', 'src/services/supabase/client.ts'];
    apiFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('supabase.from(') && !content.includes('withUserContext')) {
          issues.push(`${file}: Database queries without user context protection`);
        }
      }
    });

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? 'RLS policies properly implemented' : 'RLS policy issues detected',
      issues: issues
    };
  }

  async checkEnvironmentSecurity() {
    const issues = [];

    // 1. Check .env is gitignored
    if (fs.existsSync('.env')) {
      try {
        execSync('git check-ignore .env', { stdio: 'pipe' });
        // .env is gitignored (good)
      } catch {
        issues.push('.env file is not gitignored - critical security risk');
      }
    }

    // 2. Check for .env.example
    if (!fs.existsSync('.env.example')) {
      issues.push('Missing .env.example file for documentation');
    }

    // 3. Check for exposed environment variables in code
    const codeFiles = this.getSourceFiles();
    codeFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded secrets (basic patterns)
      if (/["']pk_live_[a-zA-Z0-9]{24,}["']/.test(content)) {
        issues.push(`${file}: Potential live API key hardcoded`);
      }
      if (/["']sk_[a-zA-Z0-9]{24,}["']/.test(content)) {
        issues.push(`${file}: Secret key hardcoded`);
      }
    });

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? 'Environment security properly configured' : 'Environment security issues detected',
      issues: issues
    };
  }

  async checkAuthenticationFlow() {
    const issues = [];

    // Check Clerk integration security
    const authFiles = [
      'src/context/ClerkAuthContext.tsx',
      'src/services/supabase/auth-helper.ts'
    ];

    authFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for secure token handling
        if (!content.includes('expo-secure-store') && content.includes('token')) {
          issues.push(`${file}: Tokens not using secure storage`);
        }
        
        // Check for proper error handling
        if (!content.includes('try') && !content.includes('catch')) {
          issues.push(`${file}: Missing error handling in auth flow`);
        }
      } else {
        issues.push(`Missing authentication file: ${file}`);
      }
    });

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? 'Authentication flow secure' : 'Authentication security issues detected',
      issues: issues
    };
  }

  async checkInputValidation() {
    const issues = [];

    // Check if validation utilities exist
    const validationFile = 'src/utils/validation.ts';
    if (!fs.existsSync(validationFile)) {
      issues.push('Missing input validation utilities');
    } else {
      const content = fs.readFileSync(validationFile, 'utf8');
      
      // Check for essential validation functions
      const requiredFunctions = [
        'validateAndSanitize',
        'sanitizeString',
        'validateRequired'
      ];
      
      requiredFunctions.forEach(func => {
        if (!content.includes(func)) {
          issues.push(`Missing validation function: ${func}`);
        }
      });
    }

    // Check API endpoints use validation
    const apiFiles = this.getSourceFiles().filter(f => f.includes('api') || f.includes('service'));
    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('user input') && !content.includes('validate')) {
        issues.push(`${file}: Potential unvalidated user input`);
      }
    });

    return {
      passed: issues.length === 0,
      message: issues.length === 0 ? 'Input validation properly implemented' : 'Input validation gaps detected',
      issues: issues
    };
  }

  async checkSecurityHeaders() {
    // For mobile app, this checks mobile security patterns
    const issues = [];

    // Check for certificate pinning (advanced security)
    const securityFiles = this.getSourceFiles();
    let hasCertificatePinning = false;
    
    securityFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('certificate') && content.includes('pinning')) {
        hasCertificatePinning = true;
      }
    });

    if (!hasCertificatePinning) {
      issues.push('Consider implementing certificate pinning for enhanced security');
    }

    return {
      passed: true, // This is informational for mobile apps
      message: 'Security configuration reviewed',
      issues: issues,
      informational: true
    };
  }

  getSourceFiles() {
    const files = [];
    const searchDirs = ['src/'];
    
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
          files.push(fullPath);
        }
      });
    };

    searchDirs.forEach(walkDir);
    return files;
  }

  categorizeResult(checkName, config, result) {
    const finding = {
      check: checkName,
      name: config.name,
      weight: config.weight,
      ...result
    };

    if (!result.passed) {
      if (config.critical) {
        this.results.critical.push(finding);
        console.log(`    🚨 CRITICAL: ${config.name} failed`);
      } else {
        this.results.high.push(finding);
        console.log(`    ⚠️  HIGH: ${config.name} failed`);
      }
    } else {
      this.results.passed.push(finding);
      console.log(`    ✅ ${config.name} passed`);
    }
  }

  generateSecurityReport() {
    const totalIssues = this.results.critical.length + this.results.high.length;
    
    console.log('\n🔒 Security Audit Results:');
    console.log(`   Critical Issues: ${this.results.critical.length}`);
    console.log(`   High Priority: ${this.results.high.length}`);
    console.log(`   Passed Checks: ${this.results.passed.length}`);

    if (this.results.critical.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES:');
      this.results.critical.forEach(issue => {
        console.log(`  • ${issue.name}: ${issue.message}`);
        if (issue.issues) {
          issue.issues.forEach(detail => console.log(`    - ${detail}`));
        }
      });
    }

    if (this.results.high.length > 0) {
      console.log('\n⚠️  HIGH PRIORITY ISSUES:');
      this.results.high.forEach(issue => {
        console.log(`  • ${issue.name}: ${issue.message}`);
        if (issue.issues) {
          issue.issues.forEach(detail => console.log(`    - ${detail}`));
        }
      });
    }

    // Save detailed results
    fs.writeFileSync('.claude/hooks/last-security-audit.json', JSON.stringify(this.results, null, 2));

    const passed = this.results.critical.length === 0;
    
    if (passed) {
      console.log('\n✅ Security audit passed - safe to push');
      return { passed: true, message: 'Security audit passed' };
    } else {
      console.log('\n❌ Security audit failed - resolve critical issues before pushing');
      return { passed: false, message: 'Critical security issues detected' };
    }
  }
}

// Main execution
async function main() {
  const auditor = new SecurityAuditor();
  const result = await auditor.runSecurityAudit();
  
  if (!result.passed) {
    process.exit(1);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { SecurityAuditor };