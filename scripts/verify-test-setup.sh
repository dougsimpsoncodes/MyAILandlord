#!/bin/bash

##############################################
# Test Setup Verification Script
# Verifies prerequisites for real auth testing
##############################################

set -e

echo "========================================="
echo "Test Setup Verification"
echo "========================================="
echo ""

# Load .env.test
if [ -f ".env.test" ]; then
  export $(grep -v '^#' .env.test | xargs)
  echo "✅ Loaded .env.test"
else
  echo "❌ .env.test file not found!"
  exit 1
fi

echo ""
echo "Checking required environment variables..."
echo ""

# Check Clerk configuration
if [ -z "$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY" ]; then
  echo "❌ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY not set"
  exit 1
else
  echo "✅ Clerk publishable key: ${EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:0:20}..."
fi

# Check Supabase configuration
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ EXPO_PUBLIC_SUPABASE_URL not set"
  exit 1
else
  echo "✅ Supabase URL: $EXPO_PUBLIC_SUPABASE_URL"
fi

if [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ EXPO_PUBLIC_SUPABASE_ANON_KEY not set"
  exit 1
else
  echo "✅ Supabase anon key: ${EXPO_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
fi

# Check test credentials
echo ""
echo "Checking test user credentials..."
echo ""

if [ -z "$LANDLORD_EMAIL" ] || [ -z "$LANDLORD_PASSWORD" ]; then
  echo "⚠️  LANDLORD_EMAIL or LANDLORD_PASSWORD not set"
  echo "   RLS tests will be skipped"
  echo "   To fix: Set these variables in .env.test"
else
  echo "✅ Landlord credentials: $LANDLORD_EMAIL"
fi

if [ -z "$TENANT_EMAIL" ] || [ -z "$TENANT_PASSWORD" ]; then
  echo "⚠️  TENANT_EMAIL or TENANT_PASSWORD not set"
  echo "   Multi-user tests may fail"
else
  echo "✅ Tenant credentials: $TENANT_EMAIL"
fi

echo ""
echo "========================================="
echo "Verifying Supabase connection..."
echo "========================================="
echo ""

# Test Supabase connection
SUPABASE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/")

if [ "$SUPABASE_CHECK" = "200" ]; then
  echo "✅ Supabase API connection successful"
else
  echo "❌ Supabase API connection failed (HTTP $SUPABASE_CHECK)"
  exit 1
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo ""
echo "✅ All required environment variables set"
echo "✅ Supabase connection verified"
echo ""
echo "⚠️  IMPORTANT: Verify test users exist in Clerk:"
echo "   1. Go to https://dashboard.clerk.com"
echo "   2. Select your application"
echo "   3. Go to Users section"
echo "   4. Ensure these users exist:"
echo "      - $LANDLORD_EMAIL"
echo "      - $TENANT_EMAIL"
echo ""
echo "   If users don't exist, create them with:"
echo "   - Email: <user email>"
echo "   - Password: <user password>"
echo "   - Verify email: YES (important!)"
echo ""
echo "Ready to run RLS tests:"
echo "  npx playwright test e2e/access-control/tenant-rls.spec.ts --config=playwright.config.real-auth.ts"
echo ""
