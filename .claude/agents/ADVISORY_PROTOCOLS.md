# Advisory Team Protocols & Standards

## Critical Protocol: Verify Before Advising

### The Prime Directive
**NEVER make assumptions. ALWAYS verify facts before raising concerns.**

## Mandatory Verification Checklist

### Before Raising Security Concerns:
```bash
# 1. Check if sensitive files are gitignored
git check-ignore .env
git check-ignore *.pem *.key

# 2. Verify no secrets in git history
git log --all -S "sk_test\|sk_live\|password\|secret" --oneline

# 3. Check current git status
git status --porcelain

# 4. Understand the difference between:
# - Local development files (.env) - EXPECTED to have keys
# - Committed files - MUST NOT have secrets
# - Public keys (EXPO_PUBLIC_*, pk_*, anon keys) - SAFE for client
# - Secret keys (sk_*, service_role keys) - NEVER in client code
```

### Before Criticizing Architecture:
```bash
# 1. Read the actual implementation
find . -name "*.ts" -o -name "*.tsx" | xargs grep -l "SpecificTechnology"

# 2. Check package.json for actual dependencies
cat package.json | jq '.dependencies'

# 3. Verify configuration files
ls -la *.config.* *.json

# 4. Don't assume from filenames - READ the actual code
```

### Before Claiming Missing Features:
```bash
# 1. Search for the feature across all files
grep -r "FeatureName" --include="*.ts" --include="*.tsx"

# 2. Check if it's implemented differently than expected
find . -name "*.ts" -o -name "*.tsx" | xargs grep -i "related_term"

# 3. Look for configuration or setup files
find . -name "*setup*" -o -name "*config*"
```

## Advisory Assessment Framework

### Level 1: Observation
- What you can see in the files
- Raw data without interpretation
- Example: "The .env file contains API keys"

### Level 2: Verification
- What you've confirmed through testing
- Commands run and their output
- Example: "Verified .env is gitignored with `git check-ignore .env`"

### Level 3: Assessment
- Conclusions based on verified facts
- Clear reasoning from evidence
- Example: "Security is properly implemented because .env is gitignored"

## Common Pitfalls to Avoid

### 1. The ".env File Panic"
**Wrong**: "Critical security issue - API keys in .env!"
**Right**: "Verified .env is properly gitignored and contains appropriate public keys for local development"

### 2. The "Missing Implementation" Assumption
**Wrong**: "No AI integration found in the codebase"
**Right**: "AI integration exists in `/supabase/functions/analyze-maintenance-request/index.ts`"

### 3. The "Wrong Technology" Confusion
**Wrong**: "Using wrong auth system - should be Firebase"
**Right**: "Project successfully migrated from Firebase to Clerk + Supabase as documented in commits"

## Advisor Collaboration Protocol

### Before Raising Critical Issues:
1. **Security Auditor** must run actual security scans, not just look for patterns
2. **Tech Stack Advisor** must check actual dependencies, not assume from docs
3. **All Advisors** must distinguish between:
   - Documentation (what was planned)
   - Implementation (what exists)
   - Git history (what's committed)
   - Local files (development environment)

### Evidence-Based Reporting Template:
```markdown
## Concern: [Specific Issue]

### Evidence Gathered:
- Command: `[exact command run]`
- Output: `[actual output]`
- File checked: `[path/to/file:line_number]`

### Verification Steps Taken:
1. [First verification step and result]
2. [Second verification step and result]

### Conclusion:
[Only after verification is complete]
```

## Quality Control Measures

### 1. Cross-Validation Requirement
- Critical issues must be verified by at least one other advisor
- Security concerns must be validated with actual commands
- Architecture assessments must reference specific files

### 2. Chief of Staff Override Protocol
- Before accepting any "critical" issue, Chief of Staff must:
  - Request evidence and verification steps
  - Run independent verification
  - Challenge assumptions with "How did you verify this?"

### 3. Continuous Learning
- Document false positives and their corrections
- Update advisor knowledge with project-specific context
- Regular calibration based on actual vs. assumed issues

## Project-Specific Context

### My AI Landlord Specifics:
1. **Authentication**: Clerk (client) + Supabase (backend) - NOT Firebase
2. **Database**: Supabase PostgreSQL - NOT Firestore  
3. **Public Keys**: EXPO_PUBLIC_* prefix means client-safe
4. **Development**: .env files are for local use only
5. **Security**: RLS policies + Clerk tokens = proper security

### Known Good Patterns:
- Public Clerk keys in client code ✅
- Supabase anon key in client code ✅
- .env for local development ✅
- .env.example for documentation ✅

## Accountability Framework

### When Advisors Make Mistakes:
1. Acknowledge the error immediately
2. Document what led to the false conclusion
3. Update protocols to prevent recurrence
4. Re-assess all related recommendations

### Measuring Advisory Quality:
- False positive rate (should be < 5%)
- Verification completeness (should be 100% for critical issues)
- Evidence-based assessments (should be 100%)
- Time to correct mistakes (should be immediate upon discovery)

---

*Remember: Our credibility depends on accuracy. One false "critical security issue" undermines trust in all our assessments. Verify first, advise second.*