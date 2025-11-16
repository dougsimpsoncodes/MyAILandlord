#!/bin/bash
# Live Testing Execution Script
# Run Playwright E2E tests with proper setup and validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_URL="http://localhost:8082"
TIMEOUT=120
MODE=${1:-"quick"}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     My AI Landlord - Live E2E Test Execution Script       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if app is running
check_app_running() {
    echo -e "${YELLOW}⏳ Checking if app is running at ${APP_URL}...${NC}"

    if curl -s --head --max-time 5 "$APP_URL" > /dev/null; then
        echo -e "${GREEN}✓ App is running${NC}"
        return 0
    else
        echo -e "${RED}✗ App is not running at ${APP_URL}${NC}"
        return 1
    fi
}

# Function to wait for app to be ready
wait_for_app() {
    echo -e "${YELLOW}⏳ Waiting for app to be ready (max ${TIMEOUT}s)...${NC}"

    local elapsed=0
    while [ $elapsed -lt $TIMEOUT ]; do
        if curl -s --head --max-time 2 "$APP_URL" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ App is ready!${NC}"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -ne "${YELLOW}   Waiting... ${elapsed}s${NC}\r"
    done

    echo -e "${RED}✗ Timeout: App did not start within ${TIMEOUT}s${NC}"
    return 1
}

# Check prerequisites
echo -e "${BLUE}→ Checking prerequisites...${NC}"

# Check if .env.test exists
if [ ! -f .env.test ]; then
    echo -e "${RED}✗ .env.test file not found${NC}"
    echo -e "${YELLOW}  Creating from .env.test.example...${NC}"

    if [ -f .env.test.example ]; then
        cp .env.test.example .env.test
        echo -e "${YELLOW}⚠ Please edit .env.test with your credentials before running tests${NC}"
        exit 1
    else
        echo -e "${RED}✗ .env.test.example not found. Cannot create .env.test${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ .env.test exists${NC}"

# Check if Playwright is installed
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${RED}✗ Playwright not found${NC}"
    echo -e "${YELLOW}  Installing Playwright...${NC}"
    npm install @playwright/test
    npx playwright install
fi

echo -e "${GREEN}✓ Playwright installed${NC}"

# Check if app is running
if ! check_app_running; then
    echo -e "${YELLOW}  Starting app...${NC}"
    echo -e "${YELLOW}  Run: npm run web${NC}"
    echo -e "${YELLOW}  Then re-run this script${NC}"
    exit 1
fi

# Display test mode
echo ""
echo -e "${BLUE}→ Test Mode: ${MODE}${NC}"

case $MODE in
    "quick")
        echo -e "${YELLOW}  Running smoke tests and critical path (30 mins)${NC}"
        TEST_CMD="npx playwright test e2e/simple-test.spec.ts e2e/auth/clerk-authentication.spec.ts e2e/maintenance-dashboard.spec.ts --project=chromium"
        ;;

    "auth")
        echo -e "${YELLOW}  Running all authentication tests (45 mins)${NC}"
        TEST_CMD="npx playwright test e2e/auth --project=chromium"
        ;;

    "critical")
        echo -e "${YELLOW}  Running critical path tests (2 hours)${NC}"
        TEST_CMD="npx playwright test e2e/auth e2e/onboarding e2e/access-control e2e/tenant e2e/uploads --project=chromium"
        ;;

    "full")
        echo -e "${YELLOW}  Running full test suite on Chromium (4 hours)${NC}"
        TEST_CMD="npx playwright test --project=chromium"
        ;;

    "all-browsers")
        echo -e "${YELLOW}  Running full test suite on all browsers (6+ hours)${NC}"
        TEST_CMD="npx playwright test"
        ;;

    "maintenance")
        echo -e "${YELLOW}  Running maintenance feature tests (1 hour)${NC}"
        TEST_CMD="npx playwright test e2e/maintenance-dashboard.spec.ts e2e/landlord-maintenance-flow.spec.ts e2e/case-detail.spec.ts --project=chromium"
        ;;

    "mobile")
        echo -e "${YELLOW}  Running tests on mobile viewports (2 hours)${NC}"
        TEST_CMD="npx playwright test e2e/auth e2e/maintenance-dashboard.spec.ts --project='Mobile Chrome' --project='Mobile Safari'"
        ;;

    *)
        echo -e "${RED}✗ Unknown mode: ${MODE}${NC}"
        echo ""
        echo "Usage: ./scripts/run-live-tests.sh [mode]"
        echo ""
        echo "Available modes:"
        echo "  quick         - Smoke tests + critical path (30 mins)"
        echo "  auth          - All authentication tests (45 mins)"
        echo "  critical      - Critical path tests (2 hours)"
        echo "  maintenance   - Maintenance feature tests (1 hour)"
        echo "  mobile        - Mobile viewport tests (2 hours)"
        echo "  full          - Full suite on Chromium (4 hours)"
        echo "  all-browsers  - Full suite all browsers (6+ hours)"
        echo ""
        echo "Example: ./scripts/run-live-tests.sh quick"
        exit 1
        ;;
esac

# Run tests
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  Starting Test Execution                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

START_TIME=$(date +%s)

# Load environment variables
set -a
source .env.test
set +a

# Execute tests
if eval $TEST_CMD; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Tests Passed! ✓                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${GREEN}Duration: ${MINUTES}m ${SECONDS}s${NC}"
    echo ""
    echo -e "${BLUE}View detailed report:${NC}"
    echo -e "  npx playwright show-report"
    echo ""
    exit 0
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))

    echo ""
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                   Tests Failed! ✗                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo -e "${RED}Duration: ${MINUTES}m ${SECONDS}s${NC}"
    echo ""
    echo -e "${YELLOW}Debugging steps:${NC}"
    echo -e "  1. View HTML report: npx playwright show-report"
    echo -e "  2. Check screenshots: test-results/"
    echo -e "  3. Review logs: Check console output above"
    echo -e "  4. Re-run failed tests: npx playwright test --last-failed"
    echo ""
    exit 1
fi
