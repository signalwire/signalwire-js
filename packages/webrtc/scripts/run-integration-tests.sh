#!/bin/bash

# RTCPeer Integration Test Runner Script
# This script ensures TypeScript compilation and runs integration tests

set -e  # Exit on any error

echo "🚀 RTCPeer Integration Test Runner"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Cleanup function
cleanup() {
    echo -e "\n🧹 Cleaning up..."
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "playwright.config.ts" ]; then
    print_error "Please run this script from the packages/webrtc directory"
    exit 1
fi

# Check if required files exist
if [ ! -f "test/turnServer.ts" ]; then
    print_error "TURN server implementation not found at test/turnServer.ts"
    exit 1
fi

if [ ! -f "src/RTCPeer.integration.test.ts" ]; then
    print_error "Integration test file not found at src/RTCPeer.integration.test.ts"
    exit 1
fi

# Step 1: Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules/@playwright" ]; then
    print_warning "Installing Playwright dependencies..."
    npm install
    npx playwright install
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Step 2: Compile TypeScript files
echo "🔨 Compiling TypeScript..."
if ! npm run build; then
    print_error "TypeScript compilation failed"
    exit 1
fi
print_status "TypeScript compilation completed"

# Step 3: Compile test files and dependencies
echo "🔧 Compiling test dependencies..."
if ! npx tsc test/turnServer.ts --outDir dist --moduleResolution node --target es2020 --module commonjs; then
    print_error "Failed to compile TURN server"
    exit 1
fi
print_status "Test dependencies compiled"

# Step 4: Run integration tests
echo "🧪 Running integration tests..."

# Parse command line arguments
BROWSERS="chromium"
HEADED=""
UI=""
REPORT=""
WORKERS="1"

while [[ $# -gt 0 ]]; do
    case $1 in
        --browsers)
            BROWSERS="$2"
            shift 2
            ;;
        --headed)
            HEADED="--headed"
            shift
            ;;
        --ui)
            UI="--ui"
            shift
            ;;
        --report)
            REPORT="--reporter=html"
            shift
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --browsers <list>    Comma-separated list of browsers (default: chromium)"
            echo "  --headed            Run in headed mode (show browser windows)"
            echo "  --ui                Run with Playwright UI"
            echo "  --report            Generate HTML report"
            echo "  --workers <n>       Number of parallel workers (default: 1)"
            echo "  --help              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Run with defaults"
            echo "  $0 --browsers chromium,firefox        # Run on specific browsers"
            echo "  $0 --headed --report                  # Run headed with HTML report"
            echo "  $0 --ui                               # Run with UI mode"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Build Playwright command
PLAYWRIGHT_CMD="npx playwright test"

if [ -n "$UI" ]; then
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $UI"
else
    # Add browser projects
    IFS=',' read -ra BROWSER_ARRAY <<< "$BROWSERS"
    for browser in "${BROWSER_ARRAY[@]}"; do
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --project=$browser"
    done
    
    if [ -n "$HEADED" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $HEADED"
    fi
    
    if [ -n "$REPORT" ]; then
        PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD $REPORT"
    fi
    
    PLAYWRIGHT_CMD="$PLAYWRIGHT_CMD --workers=$WORKERS"
fi

# Set environment variables
export NODE_ENV=test
export PWTEST_SKIP_TEST_OUTPUT=1

# Run the tests
echo "Running: $PLAYWRIGHT_CMD"
if eval $PLAYWRIGHT_CMD; then
    print_status "Integration tests completed successfully!"
    
    # Show report location if generated
    if [ -d "test-results/playwright-report" ]; then
        print_status "HTML report available at: test-results/playwright-report/index.html"
        print_status "To view report, run: npx playwright show-report"
    fi
    
    # Show test results if available
    if [ -f "test-results/test-results.json" ]; then
        print_status "JSON results available at: test-results/test-results.json"
    fi
    
else
    print_error "Integration tests failed!"
    
    # Show failure information
    if [ -d "test-results" ]; then
        print_warning "Test artifacts available in test-results/ directory"
        
        # List failed test screenshots if any
        if find test-results -name "*failed*.png" -type f | head -1 > /dev/null; then
            print_warning "Screenshots of failures:"
            find test-results -name "*failed*.png" -type f | head -5
        fi
        
        # Show traces if available
        if find test-results -name "*.zip" -type f | head -1 > /dev/null; then
            print_warning "Trace files available for debugging:"
            find test-results -name "*.zip" -type f | head -3
        fi
    fi
    
    exit 1
fi

# Step 5: Generate summary
echo "📊 Test Summary"
echo "==============="
echo "Browsers tested: $BROWSERS"
echo "Workers used: $WORKERS"
echo "Test results directory: test-results/"

if [ -f "test-results/test-results.json" ]; then
    # Extract basic stats from results (if jq is available)
    if command -v jq &> /dev/null; then
        TOTAL=$(jq '.suites[].specs | length' test-results/test-results.json 2>/dev/null | paste -sd+ - | bc 2>/dev/null || echo "N/A")
        print_status "Total test specs: $TOTAL"
    fi
fi

print_status "Integration test run completed!"