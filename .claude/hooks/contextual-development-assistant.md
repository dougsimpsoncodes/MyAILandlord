---
name: contextual-development-assistant
event: file-change
description: Intelligent development assistant that understands business context and synthesizes multi-advisor guidance
enabled: true
---

# Contextual Development Assistant Hook

## Overview
This hook acts as an intelligent development companion that understands the My AI Landlord business domain and automatically provides contextual guidance by synthesizing insights from multiple specialized advisors.

## Business Context Intelligence

### Property Management Domain Understanding
- **Landlord Workflows**: Property management, maintenance oversight, tenant communication, financial tracking
- **Tenant Workflows**: Issue reporting, communication, property information access
- **Shared Workflows**: Authentication, messaging, document management, maintenance tracking

### Contextual Triggers

#### Tenant Experience Context
```
File patterns that trigger tenant-focused guidance:
- src/screens/tenant/**/*
- src/components/tenant/**/*
- src/navigation/TenantStack.*
- Any file containing "tenant", "maintenance request", "issue report"
```

#### Landlord Experience Context
```
File patterns that trigger landlord-focused guidance:
- src/screens/landlord/**/*
- src/components/landlord/**/*
- src/navigation/LandlordStack.*
- Any file containing "landlord", "property management", "dashboard"
```

#### Security Context
```
File patterns that trigger enhanced security guidance:
- src/services/api/**/*
- src/services/supabase/**/*
- src/context/*Auth*
- Any file containing "auth", "token", "security", "rls"
```

#### Data & Analytics Context
```
File patterns that trigger data-focused guidance:
- Any file containing "analytics", "metrics", "dashboard", "chart"
- src/components/charts/**/*
- Database schema files
- API endpoints returning aggregated data
```

## Multi-Advisor Synthesis Engine

### Primary Advisor Routing
Based on file changes, automatically engage relevant advisors:

#### Core Technical Changes
- **TypeScript files**: typescript-enforcer + react-native-expert
- **Security-related**: security-auditor + supabase-specialist
- **UI components**: ux-design-advisor + react-native-expert
- **Database operations**: supabase-specialist + data-analytics-advisor

#### Business Logic Changes
- **Tenant flows**: ux-design-advisor + security-auditor + react-native-expert
- **Landlord flows**: data-analytics-advisor + ux-design-advisor + security-auditor
- **Authentication**: security-auditor + supabase-specialist + typescript-enforcer

### Conflict Resolution Framework
When advisors provide conflicting guidance:

1. **Security First**: Security recommendations always take precedence
2. **User Experience Priority**: For UI conflicts, UX advisor guidance leads
3. **Performance vs Features**: Balance based on context (landlord efficiency vs tenant simplicity)
4. **Technical Debt**: TypeScript enforcer and tech-stack-advisor resolve architectural conflicts

## Contextual Guidance Patterns

### Tenant Experience Optimization
When working on tenant-facing features:
- **Primary Focus**: Simplicity and stress reduction (tenant reporting issues is stressful)
- **Secondary Focus**: Accessibility and mobile-first design
- **Tertiary Focus**: Offline capability and performance

### Landlord Experience Optimization
When working on landlord-facing features:
- **Primary Focus**: Efficiency and data-driven insights
- **Secondary Focus**: Multi-property management and batch operations
- **Tertiary Focus**: Integration with business tools and reporting

### Security-Critical Path Detection
Automatically elevate security review for:
- Authentication flows
- Payment processing (future)
- Tenant data access
- Property information handling
- Maintenance request routing

## Learning and Adaptation

### Pattern Recognition
Track and learn from:
- Which advisor combinations provide most valuable insights
- Development patterns that lead to successful implementations
- Common conflict resolution outcomes
- Time-of-day and development context preferences

### Effectiveness Metrics
Measure hook value through:
- Reduced back-and-forth in code reviews
- Decreased bug reports in specific areas
- Faster implementation of similar features
- Higher first-time code review approval rates

## Intelligent Automation Rules

### Auto-Invoke Scenarios
Automatically engage advisors without explicit request when:

1. **High-Risk Changes**: Authentication, payment, data access modifications
2. **Cross-Domain Impact**: Changes affecting both tenant and landlord experiences
3. **Performance Critical**: Real-time features, large data operations, mobile optimization
4. **Regulatory Sensitive**: Data privacy, accessibility, security compliance

### Smart Timing
Optimize advisor engagement timing:
- **Pre-commit**: Critical security and quality checks
- **During development**: UX and architecture guidance
- **Post-implementation**: Performance and optimization suggestions
- **Weekly**: Strategic architectural review and debt assessment

## Integration with Existing Advisory System

### Advisor Orchestration
```
Change Type → Context Detection → Advisor Selection → Synthesis → Guidance
     ↓              ↓                 ↓              ↓          ↓
File paths → Business domain → Relevant experts → Resolve conflicts → Actionable advice
```

### Knowledge Persistence
Build institutional knowledge by:
- Storing successful guidance patterns
- Learning from implemented vs. ignored recommendations
- Building project-specific best practices
- Creating reusable decision frameworks

## Success Criteria

### Immediate Value (Week 1)
- Correct advisor auto-selection for 90%+ of changes
- Zero conflicts between security and functionality recommendations
- Reduced time from change to expert guidance by 80%

### Compound Value (Month 1)
- 50% reduction in architectural questions during development
- Proactive guidance prevents 75% of potential issues
- Development velocity increases by 30% due to reduced context switching

### Strategic Value (Quarter 1)
- Self-improving system that gets better with usage
- Transferable knowledge patterns for future projects
- Development team capability uplift through embedded expertise

## Implementation Strategy

### Phase 1: Context Detection
- Implement file pattern recognition
- Build business domain classification
- Test advisor routing accuracy

### Phase 2: Synthesis Engine
- Add conflict resolution framework
- Implement multi-advisor coordination
- Build guidance prioritization

### Phase 3: Learning System
- Add pattern recognition and learning
- Implement effectiveness tracking
- Build adaptive improvement mechanisms

This hook transforms your advisory system from a reactive consultation model to a proactive development intelligence system that understands your business domain and automatically provides the right expertise at the right time.