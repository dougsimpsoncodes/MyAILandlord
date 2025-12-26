#!/bin/bash
###############################################################################
# Test Fix Script - Automated E2E Testing for Bug Fixes
#
# Usage: ./scripts/test-fix.sh <test-file-pattern>
# Example: ./scripts/test-fix.sh area-photos-persist
#
# This script:
# 1. Starts the development server
# 2. Waits for server to be ready
# 3. Runs the specified E2E test
# 4. Reports results
# 5. Cleans up
###############################################################################

set -e # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TEST_PATTERN=${1:-"area-photos-persist"}
SERVER_PORT=8081
MAX_WAIT=120 # seconds

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Automated E2E Test for Bug Fix Validation         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Generate test fixtures
echo -e "${YELLOW}📦 Step 1: Generating test fixtures...${NC}"
if command -v node &> /dev/null; then
  if [ -f "scripts/generate-test-fixtures.js" ]; then
    node scripts/generate-test-fixtures.js || {
      echo -e "${YELLOW}⚠️  Could not generate fixtures (canvas package may be missing)${NC}"
      echo -e "${YELLOW}   Using placeholder images if available${NC}"
    }
  fi
else
  echo -e "${YELLOW}⚠️  Node not found, skipping fixture generation${NC}"
fi
echo ""

# Step 2: Kill any existing Metro/Expo processes
echo -e "${YELLOW}🧹 Step 2: Cleaning up existing processes...${NC}"
pkill -f "expo start" || true
pkill -f "react-native start" || true
pkill -f "metro" || true
sleep 2
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# Step 3: Start development server in background
echo -e "${YELLOW}🚀 Step 3: Starting development server on port ${SERVER_PORT}...${NC}"
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --port ${SERVER_PORT} > /tmp/expo-test-server.log 2>&1 &
SERVER_PID=$!
echo -e "${GREEN}✅ Server started (PID: ${SERVER_PID})${NC}"
echo ""

# Step 4: Wait for server to be ready
echo -e "${YELLOW}⏳ Step 4: Waiting for server to be ready...${NC}"
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  if curl -s --head --max-time 2 http://localhost:${SERVER_PORT} > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready!${NC}"
    break
  fi

  if ! ps -p $SERVER_PID > /dev/null; then
    echo -e "${RED}❌ Server process died unexpectedly${NC}"
    echo -e "${RED}   Check logs: tail /tmp/expo-test-server.log${NC}"
    exit 1
  fi

  echo -ne "${BLUE}   Waiting... ${WAIT_TIME}s / ${MAX_WAIT}s\r${NC}"
  sleep 2
  WAIT_TIME=$((WAIT_TIME + 2))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Server failed to start within ${MAX_WAIT} seconds${NC}"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi
echo ""

# Step 5: Run E2E test
echo -e "${YELLOW}🧪 Step 5: Running E2E test: ${TEST_PATTERN}${NC}"
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"
echo ""

TEST_RESULT=0
npx playwright test --grep="${TEST_PATTERN}" || TEST_RESULT=$?

echo ""
echo -e "${BLUE}─────────────────────────────────────────────────────────────${NC}"

# Step 6: Cleanup
echo -e "${YELLOW}🧹 Step 6: Cleaning up...${NC}"
kill $SERVER_PID 2>/dev/null || true
sleep 1
pkill -f "expo start" || true
echo -e "${GREEN}✅ Cleanup complete${NC}"
echo ""

# Step 7: Report results
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}║  ✅ TEST PASSED - Fix is validated and working correctly  ║${NC}"
else
  echo -e "${RED}║  ❌ TEST FAILED - Fix needs adjustment                     ║${NC}"
fi
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}🎉 Your fix works! The bug is resolved.${NC}"
  echo -e "${GREEN}   You can now commit and deploy with confidence.${NC}"
else
  echo -e "${RED}⚠️  The test failed. Review the output above for details.${NC}"
  echo -e "${RED}   You may need to adjust your fix.${NC}"
fi
echo ""

exit $TEST_RESULT
