#!/usr/bin/env node

/**
 * Contextual Development Assistant Hook
 * Intelligent development companion that understands business context
 * and synthesizes multi-advisor guidance for My AI Landlord project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Business Context Classification Engine
class BusinessContextAnalyzer {
  constructor() {
    this.contexts = {
      TENANT_EXPERIENCE: {
        patterns: [
          /src\/screens\/tenant/,
          /src\/components\/tenant/,
          /TenantStack/,
          /tenant.*flow/i,
          /maintenance.*request/i,
          /issue.*report/i,
          /ReportIssue/,
          /FollowUp/,
          /ConfirmSubmission/
        ],
        advisors: ['ux-design-advisor', 'react-native-expert', 'security-auditor'],
        priority: 'user_stress_reduction'
      },
      
      LANDLORD_EXPERIENCE: {
        patterns: [
          /src\/screens\/landlord/,
          /src\/components\/landlord/,
          /LandlordStack/,
          /Dashboard/,
          /property.*management/i,
          /vendor/i,
          /analytics/i,
          /CaseDetail/,
          /PropertyManagement/
        ],
        advisors: ['data-analytics-advisor', 'ux-design-advisor', 'security-auditor'],
        priority: 'efficiency_and_insights'
      },

      SECURITY_CRITICAL: {
        patterns: [
          /src\/services\/api/,
          /src\/services\/supabase/,
          /auth/i,
          /token/i,
          /security/i,
          /rls/i,
          /ClerkAuth/,
          /withUserContext/,
          /\.env/
        ],
        advisors: ['security-auditor', 'supabase-specialist', 'git-security-guardian'],
        priority: 'security_first'
      },

      DATA_ANALYTICS: {
        patterns: [
          /analytics/i,
          /metrics/i,
          /dashboard/i,
          /chart/i,
          /kpi/i,
          /src\/components\/charts/,
          /maintenance.*trends/i,
          /cost.*analysis/i
        ],
        advisors: ['data-analytics-advisor', 'ux-design-advisor', 'react-native-expert'],
        priority: 'actionable_insights'
      },

      API_INTEGRATION: {
        patterns: [
          /src\/services/,
          /api.*client/i,
          /supabase.*client/i,
          /edge.*function/i,
          /real.*time/i,
          /subscription/i
        ],
        advisors: ['supabase-specialist', 'typescript-enforcer', 'security-auditor'],
        priority: 'reliability_and_security'
      },

      TYPE_SAFETY: {
        patterns: [
          /\.ts$/,
          /\.tsx$/,
          /types/i,
          /interface/i,
          /src\/types/
        ],
        advisors: ['typescript-enforcer', 'tech-stack-advisor'],
        priority: 'code_quality'
      }
    };
  }

  analyzeFiles(changedFiles) {
    const contexts = new Set();
    const advisorSet = new Set();
    
    changedFiles.forEach(file => {
      Object.entries(this.contexts).forEach(([contextName, contextConfig]) => {
        if (contextConfig.patterns.some(pattern => pattern.test(file))) {
          contexts.add(contextName);
          contextConfig.advisors.forEach(advisor => advisorSet.add(advisor));
        }
      });
    });

    return {
      contexts: Array.from(contexts),
      advisors: Array.from(advisorSet),
      recommendations: this.synthesizeGuidance(contexts)
    };
  }

  synthesizeGuidance(contexts) {
    const guidance = [];

    // Context-specific guidance rules
    if (contexts.has('TENANT_EXPERIENCE')) {
      guidance.push({
        priority: 'high',
        category: 'UX',
        message: 'Tenant-facing change detected. Focus on simplicity and stress reduction. Consider voice/photo input options and clear error messaging.',
        advisors: ['ux-design-advisor', 'react-native-expert']
      });
    }

    if (contexts.has('LANDLORD_EXPERIENCE')) {
      guidance.push({
        priority: 'high',
        category: 'Analytics',
        message: 'Landlord workflow change detected. Ensure data-driven insights and batch operation efficiency. Consider mobile dashboard optimization.',
        advisors: ['data-analytics-advisor', 'ux-design-advisor']
      });
    }

    if (contexts.has('SECURITY_CRITICAL')) {
      guidance.push({
        priority: 'critical',
        category: 'Security',
        message: 'Security-sensitive change detected. Mandatory security review required. Verify RLS policies and input validation.',
        advisors: ['security-auditor', 'supabase-specialist']
      });
    }

    // Cross-context synthesis
    if (contexts.has('TENANT_EXPERIENCE') && contexts.has('SECURITY_CRITICAL')) {
      guidance.push({
        priority: 'critical',
        category: 'Security + UX',
        message: 'Tenant security interface change. Balance security requirements with user experience. Avoid security friction for stressed users.',
        advisors: ['security-auditor', 'ux-design-advisor']
      });
    }

    if (contexts.has('LANDLORD_EXPERIENCE') && contexts.has('DATA_ANALYTICS')) {
      guidance.push({
        priority: 'high',
        category: 'Business Intelligence',
        message: 'Landlord analytics change. Focus on actionable insights and mobile-optimized visualizations. Consider KPI impact.',
        advisors: ['data-analytics-advisor', 'ux-design-advisor']
      });
    }

    return guidance;
  }
}

// Advisor Orchestration Engine
class AdvisorOrchestrator {
  constructor() {
    this.advisorPriorities = {
      'security-auditor': 10,
      'typescript-enforcer': 9,
      'ux-design-advisor': 8,
      'data-analytics-advisor': 7,
      'supabase-specialist': 6,
      'react-native-expert': 5,
      'tech-stack-advisor': 4,
      'test-automation-specialist': 3,
      'git-security-guardian': 2,
      'chief-of-staff': 1
    };
  }

  async engageAdvisors(advisors, context, changedFiles) {
    // Sort advisors by priority for this context
    const sortedAdvisors = advisors.sort((a, b) => 
      (this.advisorPriorities[b] || 0) - (this.advisorPriorities[a] || 0)
    );

    const results = [];
    
    for (const advisor of sortedAdvisors) {
      try {
        const result = await this.invokeAdvisor(advisor, context, changedFiles);
        results.push({ advisor, result });
      } catch (error) {
        console.error(`Error engaging ${advisor}:`, error.message);
      }
    }

    return this.synthesizeAdvisorResults(results);
  }

  async invokeAdvisor(advisor, context, changedFiles) {
    // This would integrate with Claude Code's advisor system
    // For now, return structured guidance based on the advisor type
    
    const advisorPrompts = {
      'security-auditor': `Review the following changed files for security implications in the context of ${context.join(', ')}: ${changedFiles.join(', ')}`,
      'ux-design-advisor': `Analyze the UX impact of changes to: ${changedFiles.join(', ')} in the context of ${context.join(', ')}`,
      'data-analytics-advisor': `Assess the data and analytics implications of: ${changedFiles.join(', ')}`,
      'typescript-enforcer': `Review TypeScript compliance for: ${changedFiles.join(', ')}`,
      'supabase-specialist': `Analyze Supabase integration impact for: ${changedFiles.join(', ')}`
    };

    return {
      advisor,
      prompt: advisorPrompts[advisor] || `Review changes to: ${changedFiles.join(', ')}`,
      context: context,
      timestamp: new Date().toISOString()
    };
  }

  synthesizeAdvisorResults(results) {
    // Conflict resolution and synthesis logic
    const synthesis = {
      criticalIssues: [],
      recommendations: [],
      conflicts: [],
      summary: ''
    };

    // Group recommendations by category
    const categories = {
      security: [],
      performance: [],
      ux: [],
      architecture: []
    };

    results.forEach(({ advisor, result }) => {
      // Categorize advisor results
      if (advisor.includes('security')) {
        categories.security.push(result);
      } else if (advisor.includes('ux')) {
        categories.ux.push(result);
      }
      // ... other categorizations
    });

    // Apply conflict resolution rules
    synthesis.summary = this.generateSynthesis(categories);
    
    return synthesis;
  }

  generateSynthesis(categories) {
    let synthesis = "## Contextual Development Guidance\n\n";
    
    // Security takes precedence
    if (categories.security.length > 0) {
      synthesis += "### 🔒 Security Considerations (Priority)\n";
      synthesis += "Security requirements identified. All other recommendations should align with security constraints.\n\n";
    }

    // UX considerations for user-facing changes
    if (categories.ux.length > 0) {
      synthesis += "### 🎨 User Experience Impact\n";
      synthesis += "User-facing changes detected. Consider mobile-first design and accessibility.\n\n";
    }

    synthesis += "### 💡 Synthesized Recommendations\n";
    synthesis += "Based on business context analysis and multi-advisor input:\n";
    synthesis += "- Follow security-first principles\n";
    synthesis += "- Optimize for mobile user experience\n";
    synthesis += "- Maintain TypeScript strict compliance\n";
    synthesis += "- Consider performance implications\n\n";

    return synthesis;
  }
}

// Main Hook Execution
async function main() {
  try {
    // Get changed files from git
    const changedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file.trim() && file.endsWith('.ts') || file.endsWith('.tsx'));

    if (changedFiles.length === 0) {
      console.log('No TypeScript files changed. Contextual assistant standing by.');
      return;
    }

    console.log('🤖 Contextual Development Assistant activated...');
    console.log(`📁 Analyzing ${changedFiles.length} changed files...`);

    // Analyze business context
    const analyzer = new BusinessContextAnalyzer();
    const analysis = analyzer.analyzeFiles(changedFiles);

    console.log(`🎯 Business contexts detected: ${analysis.contexts.join(', ')}`);
    console.log(`👥 Advisors engaged: ${analysis.advisors.join(', ')}`);

    // Orchestrate advisor engagement
    const orchestrator = new AdvisorOrchestrator();
    const guidance = await orchestrator.engageAdvisors(
      analysis.advisors, 
      analysis.contexts, 
      changedFiles
    );

    // Output synthesized guidance
    console.log('\n📋 Contextual Guidance:');
    analysis.recommendations.forEach(rec => {
      console.log(`\n${rec.priority.toUpperCase()}: ${rec.category}`);
      console.log(`${rec.message}`);
      console.log(`Advisors: ${rec.advisors.join(', ')}`);
    });

    // Save guidance for future reference
    const guidanceLog = {
      timestamp: new Date().toISOString(),
      changedFiles,
      contexts: analysis.contexts,
      advisors: analysis.advisors,
      recommendations: analysis.recommendations,
      guidance
    };

    fs.writeFileSync(
      '.claude/hooks/last-guidance.json', 
      JSON.stringify(guidanceLog, null, 2)
    );

    console.log('\n✅ Contextual analysis complete. Guidance saved to .claude/hooks/last-guidance.json');

  } catch (error) {
    console.error('❌ Contextual Development Assistant error:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = { BusinessContextAnalyzer, AdvisorOrchestrator };