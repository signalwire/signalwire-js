#!/bin/bash
# Development environment initialization script
# This script starts the development server for manual testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== SignalWire UI Components - Development Environment ==="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Copy .env.example if .env doesn't exist
if [ ! -f ".env" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

PORT=${DEV_PORT:-3000}

echo ""
echo "Starting development server on port $PORT..."
echo "Test harness available at: http://localhost:$PORT/tests/test-harness.html"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start Vite dev server
npm run dev -- --port $PORT
