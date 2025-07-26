# My AI Landlord - Sub Agents

This directory contains specialized AI sub agents designed to enhance development quality, speed, and security for the My AI Landlord React Native application.

## Available Sub Agents

### 🔒 security-auditor
**Purpose:** Proactive security validation for all code changes
- Validates Clerk authentication integration
- Ensures RLS policies are properly implemented
- Scans for input validation and sanitization
- Checks for exposed secrets or API keys
- Verifies file upload security

**When Used:** Automatically invoked for all code changes to prevent security vulnerabilities

### 📱 react-native-expert
**Purpose:** React Native and Expo development specialist
- Mobile UI/UX best practices
- React Navigation v7 type-safe patterns
- Performance optimization
- Cross-platform compatibility
- Accessibility compliance

**When Used:** For UI components, navigation, state management, and mobile-specific features

### 🗄️ supabase-specialist
**Purpose:** Backend operations with Supabase
- Database schema and RLS policy design
- Edge Functions development
- Storage bucket configuration
- Real-time subscriptions
- Clerk + Supabase integration

**When Used:** For all database operations, API integrations, and backend security

### 📝 typescript-enforcer
**Purpose:** Strict TypeScript compliance and type safety
- Eliminates 'any' types
- Ensures proper interface definitions
- Validates API response types
- Enforces strict mode compliance

**When Used:** For all TypeScript code to maintain type safety and code quality

### 🧪 test-automation-specialist
**Purpose:** Comprehensive testing strategy
- Unit testing with React Testing Library
- Integration testing for API flows
- Security validation testing
- Test coverage monitoring

**When Used:** Proactively for running tests and ensuring coverage

### 🔐 git-security-guardian
**Purpose:** Git security and secrets prevention
- Pre-commit secret scanning
- Environment variable validation
- Repository security hygiene
- Commit message security review

**When Used:** Before every commit to prevent secrets exposure

## Usage Examples

### Explicit Invocation
```
> Use the security-auditor to review my recent API changes
> Have the react-native-expert optimize this component
> Ask the supabase-specialist to review my RLS policies
> Get the typescript-enforcer to fix these type errors
> Use the test-automation-specialist to add tests for this feature
> Have the git-security-guardian scan before committing
```

### Automatic Delegation
Sub agents are automatically invoked based on context:
- Code changes → security-auditor runs automatically
- UI components → react-native-expert provides guidance
- Database operations → supabase-specialist ensures security
- Type errors → typescript-enforcer fixes issues
- Missing tests → test-automation-specialist adds coverage
- Git commits → git-security-guardian scans for secrets

## Development Workflow

1. **Write Code** → react-native-expert or supabase-specialist assists
2. **Type Safety** → typescript-enforcer validates and fixes
3. **Security Review** → security-auditor scans for vulnerabilities
4. **Testing** → test-automation-specialist ensures coverage
5. **Commit** → git-security-guardian prevents secret exposure

## Security Benefits

- **Zero Secret Exposure:** git-security-guardian prevents API key commits
- **Input Validation:** security-auditor ensures all inputs are sanitized
- **RLS Protection:** supabase-specialist validates database security
- **Type Safety:** typescript-enforcer eliminates runtime type errors
- **Test Coverage:** test-automation-specialist ensures critical paths are tested

## Performance Benefits

- **Context Preservation:** Each agent operates independently
- **Specialized Expertise:** Domain-specific knowledge for faster solutions
- **Proactive Quality:** Issues caught early in development
- **Consistent Standards:** Uniform code quality across the project

## Team Usage

These sub agents are project-specific and provide consistent development standards across the team. They ensure:
- Security vulnerabilities are caught immediately
- Code quality remains high
- TypeScript compliance is maintained
- Testing coverage is comprehensive
- No secrets are accidentally committed

The sub agents work together to create a comprehensive development safety net that improves both code quality and development velocity.