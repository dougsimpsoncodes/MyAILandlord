#!/bin/bash

# Security Audit Script for My AI Landlord App
# This script performs automated security checks

echo "🔒 Starting Security Audit..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Check if .env file is properly ignored
echo "1. Checking environment file security..."
if git check-ignore .env >/dev/null 2>&1; then
    print_status 0 ".env file is properly ignored by git"
else
    print_status 1 ".env file is NOT ignored by git - THIS IS CRITICAL"
    exit 1
fi

# 2. Check for exposed secrets in git history
echo "2. Scanning git history for exposed secrets..."
SECRET_PATTERNS=("AIzaSy" "pk_test_" "sk_test_" "pk_live_" "sk_live_" "supabase_url" "supabase_key")
SECRETS_FOUND=false

for pattern in "${SECRET_PATTERNS[@]}"; do
    if git log --all --grep="$pattern" --oneline | grep -q .; then
        print_status 1 "Found potential secret pattern '$pattern' in git commit messages"
        SECRETS_FOUND=true
    fi
done

if [ "$SECRETS_FOUND" = false ]; then
    print_status 0 "No secret patterns found in git history"
fi

# 3. Check for hardcoded secrets in source files
echo "3. Scanning source files for hardcoded secrets..."
HARDCODED_FOUND=false

# Exclude node_modules and check our source files
if find src -name "*.js" -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "AIzaSy\|pk_test_\|sk_test_\|supabase_url.*=.*http" 2>/dev/null; then
    print_status 1 "Found hardcoded secrets in source files"
    HARDCODED_FOUND=true
else
    print_status 0 "No hardcoded secrets found in source files"
fi

# 4. Check for proper environment variable usage
echo "4. Checking environment variable usage..."
if grep -r "process\.env\." src/ | grep -v "EXPO_PUBLIC_" | head -1; then
    print_warning "Found non-EXPO_PUBLIC environment variables - ensure these are not client-side"
fi

# 5. Check for sensitive file extensions
echo "5. Checking for sensitive files..."
SENSITIVE_FILES=(".pem" ".p12" ".key" ".jks" "google-services.json" "GoogleService-Info.plist")
SENSITIVE_FOUND=false

for ext in "${SENSITIVE_FILES[@]}"; do
    if find . -name "*$ext" -not -path "./node_modules/*" | grep -q .; then
        print_status 1 "Found sensitive file with extension: $ext"
        SENSITIVE_FOUND=true
    fi
done

if [ "$SENSITIVE_FOUND" = false ]; then
    print_status 0 "No unmanaged sensitive files found"
fi

# 6. Check npm audit for vulnerabilities
echo "6. Running npm security audit..."
if command -v npm &> /dev/null; then
    npm audit --audit-level=high >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_status 0 "No high-severity npm vulnerabilities found"
    else
        print_status 1 "High-severity npm vulnerabilities found - run 'npm audit' for details"
    fi
else
    print_warning "npm not available for security audit"
fi

# 7. Check TypeScript configuration
echo "7. Checking TypeScript security configuration..."
if grep -q '"strict": true' tsconfig.json; then
    print_status 0 "TypeScript strict mode enabled"
else
    print_status 1 "TypeScript strict mode not enabled"
fi

# 8. Check for TODO security items in code
echo "8. Checking for security TODOs..."
TODO_COUNT=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -i "TODO.*security\|TODO.*auth\|TODO.*validate" | wc -l)
if [ $TODO_COUNT -gt 0 ]; then
    print_warning "Found $TODO_COUNT security-related TODO items"
    find src -name "*.ts" -o -name "*.tsx" | xargs grep -i "TODO.*security\|TODO.*auth\|TODO.*validate" | head -5
fi

# 9. Check for debug/console statements
echo "9. Checking for debug statements..."
DEBUG_COUNT=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep "console\." | wc -l)
if [ $DEBUG_COUNT -gt 10 ]; then
    print_warning "Found $DEBUG_COUNT console statements - review for sensitive data exposure"
fi

# 10. Summary
echo ""
echo "🔒 Security Audit Complete"
echo "=================================="

if [ "$SECRETS_FOUND" = true ] || [ "$HARDCODED_FOUND" = true ]; then
    echo -e "${RED}🚨 CRITICAL SECURITY ISSUES FOUND${NC}"
    echo "Please address the issues above before deploying to production"
    exit 1
else
    echo -e "${GREEN}✅ Basic security checks passed${NC}"
    echo "Review any warnings above and consider implementing additional security measures"
fi

echo ""
echo "📋 Security Checklist:"
echo "- [ ] Environment variables properly configured"
echo "- [ ] API keys rotated if previously exposed"
echo "- [ ] RLS policies enabled in production"
echo "- [ ] File upload limits enforced"
echo "- [ ] Error logging configured (without sensitive data)"
echo "- [ ] HTTPS enforced for all endpoints"
echo "- [ ] Security monitoring implemented"
echo ""
echo "For more details, see SECURITY.md"