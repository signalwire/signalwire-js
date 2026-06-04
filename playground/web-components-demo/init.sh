#!/bin/bash
# SignalWire WebRTC Demo - Production Test Environment Setup

set -e

echo "=== SignalWire WebRTC Demo - Test Environment Setup ==="

# Navigate to project directory
cd "$(dirname "$0")"

# Check if .env exists
if [ ! -f .env ] && [ -f .env.example ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Install dependencies (from monorepo root)
echo "Installing dependencies..."
cd ../..
npm ci
cd playground/web-components-demo

# Build all packages for production
echo "Building packages for production..."
npm run --workspace=@signalwire/js build 2>/dev/null || true
npm run --workspace=@signalwire/web-components build 2>/dev/null || true
npm run build

# Install Playwright browsers
echo "Installing Playwright browsers..."
npx playwright install chromium firefox webkit

# Run production preview server in background
echo "Starting production preview server..."
npm run preview &
PREVIEW_PID=$!

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 3

# Run tests
echo ""
echo "=== Running Playwright Tests ==="
echo ""

npm run test

# Cleanup
kill $PREVIEW_PID 2>/dev/null || true

echo ""
echo "=== Test run complete ==="
