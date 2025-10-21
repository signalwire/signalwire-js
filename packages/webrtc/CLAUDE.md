# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

The @signalwire/webrtc package is a core WebRTC utilities library within the SignalWire JavaScript SDK monorepo. It provides WebRTC-related functionality used by other SignalWire packages, including peer connection management, media device handling, and WebRTC session control.

## Essential Commands

### Development

```bash
# Install dependencies (from monorepo root)
npm i

# Build the package
npm run build

# Run tests
npm test

# Watch mode for development
npm start
```

### Testing

```bash
# Run all tests for this package
npm test

# Run a specific test file
npm test -- src/utils/deviceHelpers.test.ts
```

## Architecture Overview

### Core Components

1. **BaseConnection**: Abstract base class for WebRTC connections that extends BaseComponent from @signalwire/core. Manages WebRTC peer connections, media streams, and signaling through the Verto protocol.

2. **RTCPeer**: Manages the actual RTCPeerConnection instance, handles ICE negotiation, SDP manipulation, and media stream management. Emits events for connection state changes and media updates.

3. **Workers**: Redux saga workers that handle async side effects:
   - `vertoEventWorker`: Processes Verto protocol events (invite, answer, modify, bye)
   - `roomSubscribedWorker`: Handles room subscription events
   - `promoteDemoteWorker`: Manages member promote/demote operations
   - `sessionAuthWorker`: Handles authentication state changes

### Key Design Patterns

- **Redux Integration**: Uses Redux store from @signalwire/core for state management
- **Event-Driven**: Components communicate through EventEmitter pattern
- **Worker Pattern**: Async operations handled by saga workers responding to Redux actions
- **SDP Manipulation**: Extensive SDP helper functions for WebRTC negotiation

### Public API Exports

The package exports WebRTC utility functions through `src/index.ts`:
- Device enumeration and management functions
- Media permission checking and requesting
- Stream and track management utilities
- BaseConnection class for extending in other packages

### Media Device Utilities

Located in `src/utils/deviceHelpers.ts`:
- Device enumeration with permission handling
- Device watchers for monitoring changes
- Microphone analyzer for audio level detection
- Device ID validation and fallback logic

## Build Configuration

- **TypeScript**: Dual build outputs (ESM and CJS)
  - ESM: `dist/mjs/` (ES2017 target)
  - CJS: `dist/cjs/` (ES5 target)
- **Testing**: Jest with Babel transformation, WebRTC mocks in `src/webrtcMocks.ts`

## Dependencies

- **@signalwire/core**: Provides base components, Redux store, and common utilities
- **sdp**: SDP parsing and manipulation library

## Development Notes

### WebRTC Mock Environment

The package includes comprehensive WebRTC mocks for testing (`src/webrtcMocks.ts`). Tests run with these mocks enabled through `src/setupTests.ts`.

### Platform Primitives

Platform-specific implementations are handled through:
- `src/utils/primitives.ts`: Browser WebRTC APIs
- `src/utils/primitives.native.ts`: React Native placeholder

### SDP Helpers

Critical SDP manipulation functions in `src/utils/sdpHelpers.ts`:
- Bitrate hacks for Chrome
- Stereo audio configuration
- Media ordering for compatibility
- ICE candidate filtering