#!/usr/bin/env node

/**
 * Build Validator Hook - Ensures deployable code only
 * Runs before pushes to main/staging branches
 */

const { execSync } = require('child_process');
const fs = require('fs');

class BuildValidator {
  constructor() {
    this.validationChecks = {
      productionBuild: {
        name: 'Production Build Test',
        weight: 10,
        critical: true
      },
      environmentConfig: {
        name: 'Environment Configuration',
        weight: 8,
        critical: true
      },
      criticalTodos: {
        name: 'Critical TODO Check',
        weight: 6,
        critical: true
      },
      bundleSize: {
        name: 'Bundle Size Analysis',
        weight: 4,
        critical: false
      },
      dependencies: {
        name: 'Dependency Health',
        weight: 5,
        critical: false
      }
    };

    this.results = {
      critical: [],
      warnings: [],
      passed: [],
      metrics: {}
    };
  }

  async runBuildValidation() {
    const targetBranch = this.getTargetBranch();
    console.log(`🏗️  Running Build Validation for ${targetBranch}...`);

    // Only run full validation for main/staging branches
    if (!this.isProtectedBranch(targetBranch)) {
      console.log('ℹ️  Skipping full build validation for feature branch');
      return { passed: true, message: 'Feature branch - validation skipped' };
    }

    console.log('🚀 Protected branch detected - running full build validation...');

    // Run all validation checks
    await this.checkProductionBuild();
    await this.checkEnvironmentConfig();
    await this.checkCriticalTodos();
    await this.checkBundleSize();
    await this.checkDependencies();

    return this.generateBuildReport();
  }

  getTargetBranch() {
    try {
      // Try to get the branch being pushed to
      const refName = process.env.GIT_REFNAME || '';
      if (refName.includes('refs/heads/')) {
        return refName.replace('refs/heads/', '');
      }
      
      // Fallback to current branch
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  isProtectedBranch(branch) {
    const protectedBranches = ['main', 'master', 'staging', 'production', 'release'];
    return protectedBranches.includes(branch);
  }

  async checkProductionBuild() {
    console.log('  🔨 Testing production build...');
    
    try {
      // Check if we can create a production build
      const buildCommand = this.getBuildCommand();
      
      console.log(`    Running: ${buildCommand}`);
      const startTime = Date.now();
      
      const output = execSync(buildCommand, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300000 // 5 minute timeout
      });
      
      const buildTime = Math.round((Date.now() - startTime) / 1000);
      this.results.metrics.buildTime = buildTime;
      
      this.results.passed.push({
        check: 'productionBuild',
        message: `Production build successful (${buildTime}s)`,
        details: 'Build completed without errors'
      });
      
      console.log(`    ✅ Production build passed (${buildTime}s)`);
      
    } catch (error) {
      this.results.critical.push({
        check: 'productionBuild',
        message: 'Production build failed',
        details: error.stdout || error.stderr || error.message
      });
      
      console.log('    ❌ Production build failed');
      console.log(`    Error: ${error.message}`);
    }
  }

  getBuildCommand() {
    // Determine the appropriate build command
    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for Expo project
      if (packageJson.dependencies && packageJson.dependencies.expo) {
        return 'npx expo export --clear';
      }
      
      // Check for React Native
      if (packageJson.dependencies && packageJson.dependencies['react-native']) {
        return 'npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios-bundle.js';
      }
      
      // Generic build
      if (packageJson.scripts && packageJson.scripts.build) {
        return 'npm run build';
      }
    }
    
    // Fallback to TypeScript compilation
    return 'npx tsc --noEmit';
  }

  async checkEnvironmentConfig() {
    console.log('  🌍 Checking environment configuration...');
    
    const issues = [];
    
    // 1. Check for required environment variables
    const requiredEnvVars = [
      'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    // Check .env.example exists and has required vars
    if (fs.existsSync('.env.example')) {
      const envExample = fs.readFileSync('.env.example', 'utf8');
      
      requiredEnvVars.forEach(envVar => {
        if (!envExample.includes(envVar)) {
          issues.push(`Missing ${envVar} in .env.example`);
        }
      });
    } else {
      issues.push('Missing .env.example file');
    }
    
    // 2. Check app.json configuration
    if (fs.existsSync('app.json')) {
      const appConfig = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      
      if (!appConfig.expo) {
        issues.push('Invalid app.json - missing expo configuration');
      } else {
        // Check for required Expo config
        if (!appConfig.expo.name) {
          issues.push('Missing app name in app.json');
        }
        if (!appConfig.expo.slug) {
          issues.push('Missing app slug in app.json');
        }
        if (!appConfig.expo.version) {
          issues.push('Missing app version in app.json');
        }
      }
    } else {
      issues.push('Missing app.json configuration file');
    }
    
    if (issues.length === 0) {
      this.results.passed.push({
        check: 'environmentConfig',
        message: 'Environment configuration valid'
      });
      console.log('    ✅ Environment configuration valid');
    } else {
      this.results.critical.push({
        check: 'environmentConfig',
        message: 'Environment configuration issues',
        details: issues.join('\n    ')
      });
      console.log('    ❌ Environment configuration issues detected');
    }
  }

  async checkCriticalTodos() {
    console.log('  📝 Checking for critical TODOs...');
    
    const criticalItems = [];
    const sourceFiles = this.getSourceFiles();
    
    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        
        // Check for blocking TODOs
        if (/\/\/.*(?:TODO.*CRITICAL|FIXME.*URGENT|BUG.*BLOCKING|HACK.*REMOVE)/i.test(line)) {
          criticalItems.push({
            file,
            line: lineNum,
            content: line.trim()
          });
        }
        
        // Check for placeholder implementations in critical paths
        if (/placeholder|mock|fake|dummy/i.test(line) && 
            (file.includes('auth') || file.includes('security') || file.includes('payment'))) {
          criticalItems.push({
            file,
            line: lineNum,
            content: line.trim(),
            type: 'placeholder'
          });
        }
      });
    });
    
    if (criticalItems.length === 0) {
      this.results.passed.push({
        check: 'criticalTodos',
        message: 'No critical TODOs blocking deployment'
      });
      console.log('    ✅ No critical TODOs found');
    } else {
      this.results.critical.push({
        check: 'criticalTodos',
        message: `${criticalItems.length} critical items must be resolved`,
        details: criticalItems.map(item => 
          `${item.file}:${item.line} - ${item.content}`
        ).join('\n    ')
      });
      console.log(`    ❌ ${criticalItems.length} critical items found`);
    }
  }

  async checkBundleSize() {
    console.log('  📦 Analyzing bundle size...');
    
    try {
      // Get package.json size info
      if (fs.existsSync('package.json')) {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = Object.keys(packageJson.dependencies || {}).length;
        const devDeps = Object.keys(packageJson.devDependencies || {}).length;
        
        this.results.metrics.dependencies = deps;
        this.results.metrics.devDependencies = devDeps;
        
        // Check node_modules size (rough indicator)
        if (fs.existsSync('node_modules')) {
          try {
            const sizeOutput = execSync('du -sh node_modules', { encoding: 'utf8' });
            const size = sizeOutput.trim().split('\t')[0];
            this.results.metrics.nodeModulesSize = size;
            
            // Warn if over 500MB
            const sizeNum = parseFloat(size);
            const unit = size.slice(-2);
            
            if ((unit === 'GB') || (unit === 'MB' && sizeNum > 500)) {
              this.results.warnings.push({
                check: 'bundleSize',
                message: `Large node_modules size: ${size}`,
                details: 'Consider optimizing dependencies for mobile deployment'
              });
            }
          } catch {
            // du command might not be available
          }
        }
        
        this.results.passed.push({
          check: 'bundleSize',
          message: `Dependencies analyzed: ${deps} prod, ${devDeps} dev`
        });
        
        console.log(`    ✅ Bundle size analyzed (${deps} dependencies)`);
      }
      
    } catch (error) {
      this.results.warnings.push({
        check: 'bundleSize',
        message: 'Bundle size analysis failed',
        details: error.message
      });
    }
  }

  async checkDependencies() {
    console.log('  📚 Checking dependency health...');
    
    try {
      // Check for outdated dependencies
      const outdatedOutput = execSync('npm outdated --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (outdatedOutput.trim()) {
        const outdated = JSON.parse(outdatedOutput);
        const criticalOutdated = Object.entries(outdated).filter(([name, info]) => {
          // Consider security-related packages as critical
          return name.includes('security') || name.includes('auth') || name.includes('crypto');
        });
        
        if (criticalOutdated.length > 0) {
          this.results.warnings.push({
            check: 'dependencies',
            message: `${criticalOutdated.length} critical dependencies outdated`,
            details: criticalOutdated.map(([name, info]) => 
              `${name}: ${info.current} → ${info.latest}`
            ).join('\n    ')
          });
        }
        
        this.results.metrics.outdatedDependencies = Object.keys(outdated).length;
      }
      
      this.results.passed.push({
        check: 'dependencies',
        message: 'Dependency health checked'
      });
      
      console.log('    ✅ Dependencies checked');
      
    } catch (error) {
      // npm outdated returns non-zero exit code when outdated packages exist
      // This is expected behavior, so we don't treat it as an error
      console.log('    ✅ Dependencies checked');
    }
  }

  getSourceFiles() {
    const files = [];
    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      fs.readdirSync(dir).forEach(item => {
        const fullPath = `${dir}/${item}`;
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
          files.push(fullPath);
        }
      });
    };
    
    walkDir('src');
    return files;
  }

  generateBuildReport() {
    console.log('\n🏗️  Build Validation Results:');
    console.log(`   Critical Issues: ${this.results.critical.length}`);
    console.log(`   Warnings: ${this.results.warnings.length}`);
    console.log(`   Passed Checks: ${this.results.passed.length}`);
    
    if (this.results.metrics.buildTime) {
      console.log(`   Build Time: ${this.results.metrics.buildTime}s`);
    }
    
    if (this.results.critical.length > 0) {
      console.log('\n❌ CRITICAL BUILD ISSUES:');
      this.results.critical.forEach(issue => {
        console.log(`  • ${issue.message}`);
        if (issue.details) {
          console.log(`    ${issue.details}`);
        }
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  BUILD WARNINGS:');
      this.results.warnings.forEach(warning => {
        console.log(`  • ${warning.message}`);
        if (warning.details) {
          console.log(`    ${warning.details}`);
        }
      });
    }
    
    // Save detailed results
    fs.writeFileSync('.claude/hooks/last-build-validation.json', JSON.stringify({
      results: this.results,
      metrics: this.results.metrics,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    const passed = this.results.critical.length === 0;
    
    if (passed) {
      console.log('\n✅ Build validation passed - safe to deploy');
      return { passed: true, message: 'Build validation passed' };
    } else {
      console.log('\n❌ Build validation failed - resolve critical issues before deploying');
      return { passed: false, message: 'Critical build issues detected' };
    }
  }
}

// Main execution
async function main() {
  const validator = new BuildValidator();
  const result = await validator.runBuildValidation();
  
  if (!result.passed) {
    process.exit(1);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { BuildValidator };