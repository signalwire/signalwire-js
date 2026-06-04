# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

This is the **Web Components Demo** - a polished demo application showcasing the `@signalwire/web-components` library integrated with `@signalwire/js` SDK. It serves as both a reference implementation and testing ground for SDK features.

**This package is part of a monorepo** - see `/CLAUDE.md` at the repo root for full architecture, coding standards, and workflows.

## Commands

```bash
# Development (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# E2E Tests (Playwright)
npm run test              # Run all tests
npm run test:ui           # Interactive test UI
npm run test:headed       # Run in visible browser
npm run test:debug        # Debug mode

# From monorepo root
npm run dev:web-components-demo
npm run build:web-components-demo
```

## Architecture

```
src/
├── main.js              # Entry point, initializes AppState
├── utils/
│   └── state.js         # Observable state management (AppState class)
├── components/
│   ├── App.js           # Main shell, view routing
│   ├── WelcomeModal.js  # Authentication (token/URL modes)
│   ├── TopBar.js        # Header with connection status
│   ├── Sidebar.js       # Navigation + directory panel
│   ├── MainContent.js   # View container
│   ├── InboundCallModal.js  # Incoming call UI
│   └── views/
│       ├── DevicesView.js     # sw-device-selector, sw-audio-level
│       ├── DirectoryView.js   # sw-directory
│       ├── DialpadView.js     # sw-dialpad
│       ├── CallView.js        # sw-call-media, sw-call-controls, etc.
│       └── ClickToCallView.js # sw-click-to-call
└── styles/
    └── main.css         # CSS variables design system
```

## Key Patterns

### State Management

Simple observable pattern in `AppState` class - setters call `_notify()` to trigger re-renders:

```javascript
state.currentView = 'call'; // Triggers all subscriber callbacks
```

### Component Wiring

Web components receive SDK objects directly:

```javascript
document.querySelector('sw-call-media').call = activeCall;
document.querySelector('sw-device-selector').deviceController = signalWire;
```

### Views

Navigation state controls which view renders: `devices`, `directory`, `dialpad`, `quickcall`, `call`

## Testing

- Uses Playwright with fake media streams (configured in `playwright.config.js`)
- Auto-grants camera/microphone permissions
- Tests live in `tests/` directory
- Dev server auto-starts during tests

### Manual Testing

Use the `like-human-testing` skill with destination `/public/test-room` or search "Test Room" in directory.

## Environment Variables

Copy `.env.example` to `.env`:

- `VITE_SAT_TOKEN` - Direct SAT token for testing
- `VITE_TOKEN_URL` - Token endpoint URL (alternative auth)
- `BASE_URL` - Playwright test base URL
