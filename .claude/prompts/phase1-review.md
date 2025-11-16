# Phase 1 Code Review Prompt

You are a senior software engineer conducting a thorough code review of Phase 1 foundational stability improvements for a React Native property management app.

## Your Task

Review the implementation files listed below and provide detailed feedback on:

1. **Code Quality**: Adherence to best practices, maintainability, clarity
2. **Security**: Potential vulnerabilities, data exposure risks, authentication/authorization issues
3. **Performance**: Potential bottlenecks, inefficient patterns, scalability concerns
4. **Testing**: Test coverage adequacy, edge cases, missing test scenarios
5. **Type Safety**: TypeScript usage, any usage, type definitions
6. **Architecture**: Design patterns, separation of concerns, SOLID principles
7. **Documentation**: Code comments, inline documentation, clarity

## Files to Review

### Database Migrations
1. `supabase/migrations/20250110_add_critical_indexes.sql`
   - Review index strategy
   - Check for missing indexes
   - Verify no redundant indexes
   - Assess performance impact

2. `supabase/migrations/20250110_rls_helper_function.sql`
   - Review security implications of SECURITY DEFINER functions
   - Check for SQL injection vulnerabilities
   - Verify function stability and caching behavior
   - Assess performance improvement claims

3. `supabase/migrations/20250111_add_virus_scan_fields.sql`
   - Review schema changes
   - Check RLS policies for quarantine bucket
   - Verify helper function security

### Security Implementations
4. `src/lib/log.ts`
   - Review sanitization patterns
   - Check for missed sensitive fields
   - Verify no data exposure in edge cases
   - Test nested object handling

5. `src/lib/sentry.ts`
   - Review Sentry configuration
   - Check for sensitive data in error reports
   - Verify performance sampling rates
   - Assess error grouping strategy

6. `src/lib/rateLimiter.ts`
   - Review rate limiting algorithm
   - Check for race conditions
   - Verify Redis pipeline usage
   - Assess fail-open vs fail-closed strategy

### Test Files
7. `src/__tests__/security/rls/helpers.ts`
   - Review test utility functions
   - Check mock JWT generation security
   - Verify test isolation

8. `src/__tests__/security/rls/landlord-isolation.test.ts`
   - Review test coverage
   - Check for missing edge cases
   - Verify assertion logic

9. `src/__tests__/security/rls/tenant-isolation.test.ts`
   - Review tenant isolation tests
   - Check for privilege escalation scenarios
   - Verify RLS policy validation

10. `src/__tests__/security/rls/cross-role.test.ts`
    - Review cross-role security tests
    - Check for role-based access control gaps

11. `src/__tests__/security/rls/storage-isolation.test.ts`
    - Review storage security tests
    - Check file access control

12. `src/__tests__/utils/validation.test.ts`
    - Review validation test coverage
    - Check for missing validation scenarios

13. `src/__tests__/utils/addressValidation.test.ts`
    - Review address parsing tests
    - Check for edge cases (international addresses, etc.)

14. `src/__tests__/lib/rest.test.ts`
    - Review REST client tests
    - Check error handling coverage

15. `src/__tests__/lib/log.test.ts`
    - Review logging sanitization tests
    - Verify all sensitive patterns covered

16. `src/__tests__/hooks/useProfileSync.test.ts`
    - Review hook testing approach
    - Check for race conditions
    - Verify async behavior handling

17. `src/__tests__/components/shared/Button.test.tsx`
    - Review component test coverage
    - Check accessibility testing

18. `src/__tests__/components/shared/Card.test.tsx`
    - Review component test coverage

### Configuration
19. `web/headers.js`
    - Review CSP policy
    - Check for overly permissive rules
    - Verify all security headers present
    - Assess compatibility with dependencies

## Review Framework

For each file, provide:

### 1. Security Analysis
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No data exposure risks
- [ ] Proper authentication/authorization
- [ ] Sensitive data properly sanitized
- [ ] Rate limiting appropriate
- [ ] Input validation sufficient

### 2. Performance Analysis
- [ ] No N+1 query problems
- [ ] Efficient algorithms used
- [ ] Proper caching strategy
- [ ] Database indexes appropriate
- [ ] No memory leaks
- [ ] Async operations handled correctly

### 3. Code Quality Analysis
- [ ] Clear, readable code
- [ ] Proper error handling
- [ ] No code duplication
- [ ] Consistent naming conventions
- [ ] Appropriate abstraction levels
- [ ] SOLID principles followed

### 4. Testing Analysis
- [ ] Adequate test coverage
- [ ] Edge cases covered
- [ ] Happy path tested
- [ ] Error scenarios tested
- [ ] Mocks used appropriately
- [ ] Tests are maintainable

### 5. Type Safety Analysis
- [ ] No `any` types (or justified)
- [ ] Proper type definitions
- [ ] Type inference used where appropriate
- [ ] Generic types used correctly
- [ ] Strict null checks enabled

## Specific Questions to Answer

### Database Migrations
1. Are the indexes covering the right query patterns?
2. Could any indexes cause write performance degradation?
3. Are the RLS helper functions secure (SECURITY DEFINER concerns)?
4. Is the virus scanning schema design sound?

### Logging Sanitization
5. Are there any sensitive fields that are NOT being sanitized?
6. Is the sanitization regex too aggressive (false positives)?
7. Could the sanitization be bypassed with different field names?
8. Is the performance impact of sanitization acceptable?

### Rate Limiting
9. Is the sliding window algorithm implemented correctly?
10. Could the Redis pipeline operations have race conditions?
11. Is fail-open the right strategy, or should it be fail-closed?
12. Are the rate limits appropriate for each operation type?

### RLS Tests
13. Do the RLS tests cover all tenant isolation scenarios?
14. Are there any privilege escalation paths not tested?
15. Do the tests validate both SELECT and INSERT/UPDATE/DELETE?
16. Is the mock JWT generation secure enough for testing?

### Security Headers
17. Is the CSP policy too permissive?
18. Are there any missing security headers?
19. Could the `unsafe-inline` directives be removed?
20. Is the HSTS configuration correct for production?

## Output Format

Provide your review in this format:

```markdown
# Phase 1 Code Review

## Overall Assessment
[Brief summary of overall code quality, security posture, and readiness]

**Grade**: [A+ to F]
**Security Risk**: [Low/Medium/High]
**Production Ready**: [Yes/No/With Changes]

## Critical Issues 🚨
[Issues that MUST be fixed before deployment]

1. **[File Name]** - [Issue Description]
   - **Severity**: Critical
   - **Impact**: [Description]
   - **Fix**: [Specific recommendation]

## High Priority Issues ⚠️
[Issues that should be fixed soon]

1. **[File Name]** - [Issue Description]
   - **Severity**: High
   - **Impact**: [Description]
   - **Fix**: [Specific recommendation]

## Medium Priority Issues 📋
[Issues that can be addressed in Phase 2]

1. **[File Name]** - [Issue Description]
   - **Severity**: Medium
   - **Impact**: [Description]
   - **Fix**: [Specific recommendation]

## Low Priority / Nice-to-Haves 💡
[Optional improvements]

1. **[File Name]** - [Suggestion]

## Positive Highlights ✅
[Things done particularly well]

1. [Specific implementation or pattern that is excellent]

## Detailed File-by-File Review

### Database Migrations

#### supabase/migrations/20250110_add_critical_indexes.sql
- **Security**: [Rating + Comments]
- **Performance**: [Rating + Comments]
- **Code Quality**: [Rating + Comments]
- **Recommendations**: [List]

[Continue for each file...]

## Testing Coverage Assessment

**Overall Coverage**: [Percentage and quality assessment]
**Missing Test Scenarios**: [List critical untested scenarios]
**Test Quality**: [Assessment of test maintainability and value]

## Security Posture Assessment

**Authentication/Authorization**: [Rating + Comments]
**Data Protection**: [Rating + Comments]
**Input Validation**: [Rating + Comments]
**Rate Limiting**: [Rating + Comments]
**Logging/Monitoring**: [Rating + Comments]

## Performance Assessment

**Database Queries**: [Rating + Comments]
**Caching Strategy**: [Rating + Comments]
**Async Operations**: [Rating + Comments]
**Scalability**: [Rating + Comments]

## Deployment Readiness Checklist

- [ ] All critical issues resolved
- [ ] Security vulnerabilities addressed
- [ ] Performance bottlenecks identified
- [ ] Test coverage adequate
- [ ] Documentation complete
- [ ] Rollback procedures tested
- [ ] Monitoring configured
- [ ] Rate limiting tested

## Recommendations for Phase 2

1. [Specific recommendation for next phase]
2. [Specific recommendation for next phase]
...

## Final Verdict

**Overall**: [Summary recommendation]
**Deployment**: [Go/No-Go decision with conditions]
```

## Additional Context

### Tech Stack
- **Frontend**: React Native 0.79, Expo 53, React 19
- **Backend**: Supabase (PostgreSQL), Clerk Authentication
- **State**: React Context API
- **Storage**: Supabase Storage
- **Monitoring**: Sentry
- **Rate Limiting**: Upstash Redis
- **Testing**: Jest, React Testing Library

### Key Concerns
1. **Multi-tenant data isolation**: Absolutely critical - any RLS violation is a security breach
2. **Performance at scale**: App needs to support 500+ properties, 1000+ maintenance requests
3. **Type safety**: Currently 46 `any` types - assess risk level
4. **Production readiness**: Is this code safe to deploy?

### Files NOT to Review (Already Reviewed Previously)
- Core application code (screens, components, hooks)
- Existing migration files (not changed in Phase 1)
- Configuration files (package.json, tsconfig.json)

## Start Your Review

Begin by reading the summary document:
- `docs/PHASE_1_COMPLETE_SUMMARY.md`

Then review each file in the order listed above, providing detailed feedback according to the framework.

**Focus on**: Security vulnerabilities, data exposure risks, RLS violations, performance bottlenecks, and production readiness.

**Be thorough**: This code will handle sensitive landlord/tenant data. Any security issue could lead to data breaches.

**Be specific**: Don't just say "improve error handling" - specify exactly what error scenarios are not handled and how to fix them.

Thank you for your thorough review!
