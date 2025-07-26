#!/usr/bin/env node

/**
 * Code Quality Gate Hook - Ensures code quality before commits
 * Prevents broken code and maintains development standards
 */

const { execSync } = require('child_process');
const fs = require('fs');

class QualityGate {
  constructor() {
    this.checks = {
      typescript: {
        name: 'TypeScript Compilation',
        command: 'npx tsc --noEmit',
        required: true,
        weight: 10
      },
      eslint: {
        name: 'ESLint',
        command: 'npx eslint --ext .ts,.tsx src/ --max-warnings 0',
        required: false,
        weight: 5
      },
      prettier: {
        name: 'Prettier Formatting',
        command: 'npx prettier --check "src/**/*.{ts,tsx}"',
        required: false,
        weight: 3
      },
      advisoryProtocols: {
        name: 'Advisory Protocol Compliance',
        custom: true,
        required: true,
        weight: 8
      },
      todoCheck: {
        name: 'TODO/FIXME Analysis',
        custom: true,
        required: false,
        weight: 2
      }
    };

    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      score: 0,
      maxScore: 0
    };
  }

  async runQualityChecks() {
    console.log('🚦 Running Code Quality Gate...');
    
    const stagedFiles = this.getStagedFiles();
    if (stagedFiles.length === 0) {
      return { passed: true, message: 'No staged files to check' };
    }

    console.log(`📁 Checking ${stagedFiles.length} staged files...`);

    // Run all quality checks
    for (const [checkName, checkConfig] of Object.entries(this.checks)) {
      await this.runCheck(checkName, checkConfig, stagedFiles);
    }

    // Calculate final score and recommendation
    this.calculateScore();
    return this.generateReport();
  }

  getStagedFiles() {
    try {
      return execSync('git diff --cached --name-only', { encoding: 'utf8' })
        .split('\n')
        .filter(file => file.trim() && (file.endsWith('.ts') || file.endsWith('.tsx')));
    } catch (error) {
      return [];
    }
  }

  async runCheck(checkName, config, stagedFiles) {
    try {
      console.log(`  🔍 ${config.name}...`);

      let result;
      if (config.custom) {
        result = await this.runCustomCheck(checkName, stagedFiles);
      } else {
        result = await this.runCommandCheck(config);
      }

      if (result.passed) {
        this.results.passed.push({
          name: checkName,
          message: result.message || `${config.name} passed`,
          weight: config.weight
        });
        console.log(`    ✅ ${config.name} passed`);
      } else {
        const failure = {
          name: checkName,
          message: result.message || `${config.name} failed`,
          details: result.details,
          weight: config.weight,
          required: config.required
        };

        if (config.required) {
          this.results.failed.push(failure);
          console.log(`    ❌ ${config.name} failed (REQUIRED)`);
        } else {
          this.results.warnings.push(failure);
          console.log(`    ⚠️  ${config.name} failed (WARNING)`);
        }

        if (result.details) {
          console.log(`    Details: ${result.details}`);
        }
      }

    } catch (error) {
      const failure = {
        name: checkName,
        message: `${config.name} check error`,
        details: error.message,
        weight: config.weight,
        required: config.required
      };

      if (config.required) {
        this.results.failed.push(failure);
        console.log(`    ❌ ${config.name} error (BLOCKING)`);
      } else {
        this.results.warnings.push(failure);
        console.log(`    ⚠️  ${config.name} error (WARNING)`);
      }
    }
  }

  async runCommandCheck(config) {
    try {
      const output = execSync(config.command, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { 
        passed: true, 
        message: `${config.name} passed`,
        output 
      };
    } catch (error) {
      return { 
        passed: false, 
        message: `${config.name} failed`,
        details: error.stdout || error.stderr || error.message
      };
    }
  }

  async runCustomCheck(checkName, stagedFiles) {
    switch (checkName) {
      case 'advisoryProtocols':
        return this.checkAdvisoryProtocols(stagedFiles);
      case 'todoCheck':
        return this.checkTodos(stagedFiles);
      default:
        return { passed: true, message: 'Custom check not implemented' };
    }
  }

  async checkAdvisoryProtocols(stagedFiles) {
    // Check if changes follow advisory protocols
    const violations = [];

    for (const file of stagedFiles) {
      try {
        const content = execSync(`git show :${file}`, { encoding: 'utf8' });
        
        // Check for common protocol violations
        
        // 1. Security assumptions without verification
        if (content.includes('// SECURITY:') && !content.includes('verified')) {
          violations.push(`${file}: Security assumption without verification`);
        }

        // 2. Critical issues without evidence
        if (content.includes('CRITICAL:') && !content.includes('Evidence:')) {
          violations.push(`${file}: Critical claim without evidence`);
        }

        // 3. Any types in new code (TypeScript enforcer)
        if (content.includes(': any') || content.includes('<any>')) {
          violations.push(`${file}: 'any' type usage detected`);
        }

        // 4. Console statements in production code
        if (content.includes('console.log') && !file.includes('test')) {
          violations.push(`${file}: Console statement in production code`);
        }

      } catch (error) {
        // File might be deleted or binary, skip
      }
    }

    if (violations.length > 0) {
      return {
        passed: false,
        message: 'Advisory protocol violations detected',
        details: violations.join('\n    ')
      };
    }

    return { passed: true, message: 'Advisory protocols followed' };
  }

  async checkTodos(stagedFiles) {
    const todos = [];
    const criticalTodos = [];

    for (const file of stagedFiles) {
      try {
        const content = execSync(`git show :${file}`, { encoding: 'utf8' });
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          const lineNum = index + 1;
          
          // Check for TODO/FIXME/HACK comments
          if (/\/\/.*(?:TODO|FIXME|HACK|BUG)/i.test(line)) {
            const todo = {
              file,
              line: lineNum,
              content: line.trim(),
              type: line.includes('FIXME') || line.includes('BUG') ? 'critical' : 'normal'
            };

            if (todo.type === 'critical') {
              criticalTodos.push(todo);
            } else {
              todos.push(todo);
            }
          }
        });

      } catch (error) {
        // Skip files that can't be read
      }
    }

    const message = `Found ${todos.length} TODOs, ${criticalTodos.length} critical items`;
    
    if (criticalTodos.length > 0) {
      return {
        passed: false,
        message: 'Critical TODOs/FIXMEs must be resolved',
        details: criticalTodos.map(t => `${t.file}:${t.line} - ${t.content}`).join('\n    ')
      };
    }

    return { 
      passed: true, 
      message,
      details: todos.length > 0 ? `${todos.length} non-critical TODOs found` : undefined
    };
  }

  calculateScore() {
    // Calculate quality score
    this.results.maxScore = Object.values(this.checks).reduce((sum, check) => sum + check.weight, 0);
    
    this.results.score = this.results.passed.reduce((sum, check) => sum + check.weight, 0);
    
    // Partial credit for warnings (half weight)
    this.results.score += this.results.warnings.reduce((sum, check) => sum + (check.weight * 0.5), 0);
  }

  generateReport() {
    const scorePercentage = Math.round((this.results.score / this.results.maxScore) * 100);
    
    console.log(`\n📊 Quality Score: ${this.results.score}/${this.results.maxScore} (${scorePercentage}%)`);
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ BLOCKING ISSUES:');
      this.results.failed.forEach(failure => {
        console.log(`  • ${failure.message}`);
        if (failure.details) {
          console.log(`    ${failure.details}`);
        }
      });
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach(warning => {
        console.log(`  • ${warning.message}`);
        if (warning.details) {
          console.log(`    ${warning.details}`);
        }
      });
    }

    if (this.results.passed.length > 0) {
      console.log('\n✅ PASSED CHECKS:');
      this.results.passed.forEach(check => {
        console.log(`  • ${check.message}`);
      });
    }

    // Save detailed results
    fs.writeFileSync('.claude/hooks/last-quality-check.json', JSON.stringify(this.results, null, 2));

    // Determine if commit should proceed
    const shouldProceed = this.results.failed.length === 0;
    
    if (shouldProceed) {
      console.log('\n✅ Quality gate passed - commit approved');
      return { passed: true, score: scorePercentage, message: 'Quality checks passed' };
    } else {
      console.log('\n❌ Quality gate failed - fix issues before committing');
      return { passed: false, score: scorePercentage, message: 'Quality checks failed' };
    }
  }
}

// Main execution
async function main() {
  const qualityGate = new QualityGate();
  const result = await qualityGate.runQualityChecks();
  
  if (!result.passed) {
    process.exit(1);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { QualityGate };