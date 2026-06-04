# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Note:** This package is part of a monorepo. See the root `CLAUDE.md` for overall project architecture and conventions.

## Package Overview

`@signalwire/js` is the core WebRTC browser SDK implementing the Verto signaling protocol. It provides reactive state management via RxJS observables.

## Commands (Package-Specific)

```bash
# From this package directory (packages/main)
npm run dev              # Watch mode with tsdown
npm run build            # Build both ESM/CJS and browser bundle
npm run test             # Run vitest
npm run test:ui          # Vitest with UI
npm run test:coverage    # Run with coverage report
npm run lint             # ESLint src/
npm run type-check       # TypeScript checking
npm run check:circular   # Check for circular dependencies

# Run a single test
npx vitest src/controllers/WebSocketController.test.ts
```

## Directory Structure

```
src/
├── behaviors/           # Base classes (Destroyable, Fetchable)
├── clients/             # SignalWire - main entry point
├── containers/          # DependencyContainer (singleton), PreferencesContainer
├── controllers/         # Low-level controllers (WebSocket, RTC, ICE, etc.)
├── core/
│   ├── entities/        # Domain entities (Call, Participant, Address, User)
│   ├── RPCMessages/     # Verto protocol JSON-RPC messages and type guards
│   ├── capabilities/    # Feature capability detection
│   └── types/           # Shared type definitions
├── managers/            # High-level managers (Transport, Verto, Directory, etc.)
├── operators/           # Custom RxJS operators
└── utils/               # Logger, helpers
```

## Key Internal Patterns

### Public API Surface (`index.ts`)

The package exports a minimal public API. Internal modules must **never** import from `index.ts` - they must import directly from source files to avoid circular dependencies.

**Exported:** `SignalWire`, domain models (`Call`, `Participant`, `Address`), types
**Not Exported:** Controllers, Managers, Containers, behaviors, RPC internals

### Destroyable Pattern

All stateful classes extend `Destroyable` for automatic cleanup:

```typescript
class MyClass extends Destroyable {
  private _state$ = this.createBehaviorSubject<State>(initialState);

  constructor() {
    super();
    this.subscribeTo(someObservable$, (value) => {
      /* ... */
    });
  }

  public override destroy(): void {
    // Custom cleanup
    super.destroy(); // Completes all subjects, unsubscribes all subscriptions
  }
}
```

### Manager Initialization Pattern

Calls use a callback-based initialization to avoid circular dependencies:

```typescript
// In ClientSessionManager
const call = new WebRTCCallSession(options, {
  initializeManagers: (call) => ({
    vertoManager: new WebRTCVertoManager(call, ...),
    callEventsManager: new CallEventsManager(call, ...),
  }),
});
```

### RPC Type Guards (`src/core/RPCMessages/guards/`)

Use generated type guards for discriminating RPC messages:

```typescript
import { isMemberJoinedMetadata } from '../core/RPCMessages/guards/events.guards';

this.subscribeTo(events$, (event) => {
  if (isMemberJoinedMetadata(event)) {
    // event is narrowed to MemberJoinedPayload
  }
});
```

## Testing

- Tests use Vitest with `happy-dom` environment
- Test files: `*.test.ts` colocated with source files
- Coverage thresholds: 80% lines/functions/statements, 75% branches
- Setup file: `../../tests/setup.ts`

## Build Outputs

- `dist/index.mjs` / `dist/index.cjs` - ESM/CJS for bundlers
- `dist/browser.umd.js` - UMD bundle for `<script>` tags (unpkg/jsdelivr)
- `dist/operators/` - Separate entry for custom RxJS operators
