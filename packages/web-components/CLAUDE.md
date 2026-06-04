# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

This is `@signalwire/web-components` - a Lit-based UI component library for SignalWire WebRTC communication. It ships two layers:

- **SDK-aware components** (`src/components/*.ts`) wired to `@signalwire/js` via RxJS observables and Lit context (call media, controls, directory, etc.).
- **`sw-ui-*` UI primitives** (`src/components/UI/`) — presentational, SDK-agnostic building blocks (icons, modal, dialpad, control bar, layouts, alerts, transcript view) that consume design tokens from `theme.css`.

## Commands

```bash
# Development
npm run dev              # Vite dev server
npm run dev:test         # Dev server on port 3000 (for e2e tests)

# Building
npm run build            # tsc declarations + vite library build

# Testing
npm run test             # Vitest unit tests
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright e2e tests (requires dev:test running)
npm run test:coverage    # Coverage report (80% threshold)

# Single test file
npx vitest src/components/sw-call-controls.test.ts
npx playwright test tests/e2e/call-media.spec.ts

# Code quality
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

## Architecture

### Component Structure

All components extend `LitElement` and follow this pattern:

```
src/
├── components/                          # SDK-aware web components (sw-* family)
│   ├── sw-call-media.ts                   # Remote video; consumes call-state context
│   ├── sw-self-media.ts                   # Local video overlay (participant-list slot)
│   ├── sw-local-camera.ts                 # Devices-context-aware local camera preview
│   ├── sw-participants.ts                 # Remote participant overlays
│   ├── sw-participant-controls.ts         # Per-participant mute/volume
│   ├── sw-call-controls.ts                # Mute/hangup/screen-share button bar
│   ├── sw-call-status.ts                  # Status text + duration timer
│   ├── sw-call-provider.ts                # Provides Call/Devices/Transcript context
│   ├── sw-call-dialpad.ts                 # Context-aware DTMF pad bound to active call
│   ├── sw-audio-level.ts                  # Real-time audio visualization
│   ├── sw-click-to-call.ts                # Single-button call initiator (wraps widget)
│   ├── sw-directory.ts                    # Searchable contact list
│   ├── sw-device-selector/                # Audio/video device dropdowns
│   │   ├── sw-device-selector.ts
│   │   ├── sw-device-selector.styles.ts
│   │   └── index.ts
│   ├── sw-call-widget/                    # Drop-in widget composing the SDK family
│   │   └── sw-call-widget.ts
│   └── UI/                                # sw-ui-* primitives (no SDK coupling)
│       ├── icons/                           # sw-ui-icon + ICONS map + .svg assets
│       ├── controls/                        # sw-ui-dropup, sw-ui-split-button,
│       │                                    # sw-ui-control-bar, sw-ui-dialpad
│       ├── layout/                          # sw-ui-call-layout, sw-ui-background,
│       │                                    # sw-ui-modal, sw-ui-content-drawer,
│       │                                    # sw-ui-responsive-container
│       ├── sw-ui-alert.ts
│       ├── sw-ui-transcript-view.ts
│       └── DEFAULT_BACKGROUND.ts            # bundled webp + base64 thumbnail
├── context/                             # Reactive context layer
│   ├── call-state-context.ts              # callStateContext + types
│   ├── devices-context.ts                 # devicesContext + types
│   ├── transcript-context.ts              # transcriptContext + types
│   ├── CallStateContextController.ts      # Subscribes to Call, provides callStateContext
│   ├── DevicesContextController.ts        # Subscribes to DeviceController, provides devicesContext
│   ├── TranscriptController.ts            # Provides transcriptContext
│   ├── UserEventController.ts             # User/agent events (e.g. display_content)
│   ├── chat-state.ts                      # ChatState/ChatEntry types
│   └── types.ts                           # Shared ContextHost type
├── types/
│   └── index.ts                # Local TypeScript interfaces
├── utils/
│   ├── video.ts                # Video element helpers
│   ├── debounce.ts             # Debounce utility
│   ├── prism.ts                # Lazy Prism language loader (sw-ui-transcript-view)
│   └── transcriptToMarkdown.ts # Transcript → markdown serializer
└── theme.css                   # Design tokens consumed by sw-ui-* components
```

The `sw-ui-*` family is also surfaced individually through package subpath
exports (e.g. `@signalwire/web-components/sw-ui-modal`) and re-exported in
bulk from `src/index.ts` via `src/components/UI/index.ts`.

### Context System

State is shared via four reactive controllers in `src/context/` that wrap
`@lit/context` providers:

- `CallStateContextController` → `callStateContext` (call meta, participants,
  layouts, capabilities, incoming-call info).
- `DevicesContextController` → `devicesContext` (device lists, current
  selection, permissions).
- `TranscriptController` → `transcriptContext` (transcript entries).
- `UserEventController` (events on the host element, e.g. `display_content`).

`<sw-call-provider>` is the top-level provider — wrap your tree in it (or use
`<sw-call-widget>`, which sets up the same providers internally):

```html
<sw-call-provider .call="${callObject}" .deviceController="${deviceController}">
  <sw-call-media></sw-call-media>
  <sw-self-media></sw-self-media>
  <sw-call-controls></sw-call-controls>
</sw-call-provider>
```

Child components consume context via `@consume()`:

```typescript
@consume({ context: callStateContext, subscribe: true })
@property({ attribute: false })
private _callState?: CallState;
```

`<sw-call-media>` still accepts a `.call` property directly when used outside
a provider (it self-hosts a `CallStateContextController` in that case).

### Observable Integration

Components subscribe to RxJS observables from the main SDK:

```typescript
private subscriptions: Subscription[] = [];

connectedCallback() {
  super.connectedCallback();
  this.subscriptions.push(
    this._call?.remoteStream$.subscribe(stream => {
      // Update component state
      this.requestUpdate();
    })
  );
}

disconnectedCallback() {
  super.disconnectedCallback();
  this.subscriptions.forEach(sub => sub.unsubscribe());
  this.subscriptions = [];
}
```

### Key Interfaces

```typescript
// Expected Call interface from main SDK
interface Call {
  self?: { id: string };
  remoteStream$: Observable<MediaStream | null>;
  localStream$: Observable<MediaStream | null>;
  layoutLayers$: Observable<LayoutLayer[]>;
  status$: Observable<CallStatus>;
}

// Layout positioning (percentage-based)
interface LayoutLayer {
  member_id?: string;
  x: number; // 0-100
  y: number; // 0-100
  width: number; // 0-100
  height: number; // 0-100
}
```

## Component Conventions

### Custom Events

All events bubble and cross shadow DOM:

```typescript
this.dispatchEvent(
  new CustomEvent('sw-mute-audio', {
    detail: { muted: true },
    bubbles: true,
    composed: true
  })
);
```

Event prefixes: `sw-mute-audio`, `sw-hangup`, `sw-device-change`, `sw-digit-press`

### CSS Parts

Components expose internal elements for external styling:

```css
sw-call-controls::part(button) {
  background: red;
}
sw-call-controls::part(button-active) {
  background: green;
}
```

### Design Tokens

The `sw-ui-*` family and the refreshed SDK-aware components (e.g. `directory`)
consume design tokens defined in `src/theme.css`. Override at any host or
ancestor element. Common token families:

```css
/* foreground / background */
--fg-default, --fg-muted
--bg-surface, --bg-surface-raised

/* interactive */
--interactive-button-primary-bg, --interactive-button-primary-hover
--interactive-status-success, --interactive-dropdown-hover

/* structure */
--border-default, --radius-sm, --radius-md
--sp-1 … --sp-6                 /* spacing scale */
--type-family-body
--type-size-caption, --type-size-small, --type-size-body
```

The legacy `--sw-color-*` / `--sw-space-*` / `--sw-font-*` variables that the
older components shipped have been retired with the introduction of
`theme.css`. If you maintain a downstream theme, migrate to the new token
names.

## Testing

### Unit Tests (Vitest)

- Environment: happy-dom
- Location: `src/**/*.test.ts` or `tests/unit/**/*.test.ts`
- Mock fixtures: `tests/fixtures/mock-call.ts`

```typescript
import { createMockCall, createMockMediaStream } from '../tests/fixtures/mock-call';

const mockCall = createMockCall();
mockCall.remoteStream$.next(createMockMediaStream());
```

### E2E Tests (Playwright)

- Location: `tests/e2e/*.spec.ts`
- Test harness: `tests/test-harness.html`
- Fake media enabled for Chromium

```bash
# Run e2e tests
npm run dev:test &  # Start server first
npm run test:e2e
```

## Integration with Main SDK

Shared types (`Call`, `DeviceController`, `LayoutLayer`) are imported from `@signalwire/js` and re-exported via `src/types/index.ts`. `CallStatus` is imported directly from `@signalwire/js` where needed (e.g., `sw-call-status.ts`). Web-component-specific types (`Participant`, `CallSelf`) are defined locally in `src/types/index.ts`. Internal helper functions (`getSelfId`, `castParticipants`) are not re-exported from the public API.
