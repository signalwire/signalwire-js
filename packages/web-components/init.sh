#!/bin/bash
# Production test environment initialization script
# This script builds the project and runs Playwright tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== SignalWire UI Components - Test Environment ==="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Install Playwright browsers if needed
echo "Ensuring Playwright browsers are installed..."
npx playwright install chromium --with-deps 2>/dev/null || npx playwright install chromium

# Build the project for production
echo ""
echo "Building project for production..."
npm run build

# Copy .env.example if .env doesn't exist
if [ ! -f ".env" ]; then
  cp .env.example .env
fi

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set CI mode for tests
export CI=true

echo ""
echo "Running Playwright tests..."
echo ""

# Run tests
npx playwright test "$@"

# Show results summary
echo ""
echo "=== Test Complete ==="
echo "HTML report: test-results/html/index.html"
echo "JSON results: test-results/results.json"
