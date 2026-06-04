#!/bin/bash
# SignalWire WebRTC Demo - Development Environment Setup

set -e

echo "=== SignalWire WebRTC Demo - Development Setup ==="

# Navigate to project directory
cd "$(dirname "$0")"

# Check if .env exists, create from example if not
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env and add your SAT token before running the app."
  fi
fi

# Install dependencies (from monorepo root)
echo "Installing dependencies..."
cd ../..
npm install
cd playground/web-components-demo

# Build dependent packages
echo "Building dependent packages..."
npm run --workspace=@signalwire/js build 2>/dev/null || true
npm run --workspace=@signalwire/web-components build 2>/dev/null || true

# Start development server
echo ""
echo "=== Starting Development Server ==="
echo "Open http://localhost:3000 in your browser"
echo ""

npm run dev
