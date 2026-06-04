# Playwright Integration Tests - Browser Bundle

This directory contains integration tests for RTCPeerConnectionController using Playwright.

## Architecture

The tests use a **browser bundle** approach to test `RTCPeerConnectionController` in a real browser environment:

```
┌─────────────────────────────────────────────────────────────┐
│ Playwright Test (Node.js)                                   │
│  ├─ Launches browser via page.goto()                        │
│  └─ Executes code in browser via page.evaluate()            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser Context                                              │
│  ├─ test-page.html (served by test-server.js)               │
│  └─ browser-bundle.js (ES Module)                            │
│       ├─ RTCPeerConnectionController                         │
│       ├─ PreferencesManager                                  │
│       └─ RxJS + all dependencies (bundled)                   │
└─────────────────────────────────────────────────────────────┘
```

## Files

### Source Files
- **`browser-entry.ts`** - Entry point that exports controller for browser
- **`rtc-peer-connection.spec.ts`** - Integration test suite
- **`test-page.html`** - HTML page that loads the browser bundle
- **`test-server.js`** - Simple HTTP server for tests

### Configuration
- **`../tsdown.browser.config.ts`** - Bundle configuration for browser
- **`../playwright.config.ts`** - Playwright test configuration

### Generated (git-ignored)
- **`dist/browser-bundle.js`** - Self-contained browser bundle with all dependencies
- **`dist/browser-bundle.js.map`** - Sourcemap for debugging

## How It Works

### 1. Build Phase (`npm run build:browser`)

The build script uses `tsdown` with a custom config to:
- Bundle `RTCPeerConnectionController` and all its dependencies
- Include RxJS observables in the bundle
- Generate ES module output for modern browsers
- Create sourcemaps for debugging

### 2. Test Server (`test-server.js`)

A simple HTTP server that serves:
- `/` or `/index.html` → `test-page.html`
- `/dist/*` → Browser bundle and sourcemaps

Running on `http://localhost:8765`

### 3. Browser Page (`test-page.html`)

Loads the browser bundle as an ES module:
```html
<script type="module">
  import * as controller from '/dist/browser-bundle.js';
</script>
```

### 4. Test Execution

Playwright tests use `page.evaluate()` to:
- Dynamically import the controller module
- Create peer connection instances
- Test WebRTC negotiation flow
- Verify observable state streams

**No window pollution** - everything uses clean ES module imports!

## Running Tests

### Build browser bundle and run tests:
```bash
npm run test:integration
```

This automatically:
1. Builds the browser bundle (`build:browser`)
2. Starts the test server
3. Runs Playwright tests
4. Shuts down the server

### Build browser bundle only:
```bash
npm run build:browser
```

### Run tests with existing bundle:
```bash
npx playwright test
```

## Development Workflow

1. **Make changes**
2. **Rebuild bundle**: `npm run build:browser`
3. **Run tests**: `npx playwright test`

Or use the combined command:
```bash
npm run test:integration
```
