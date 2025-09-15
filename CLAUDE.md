# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is public a monorepo containing SignalWire's JavaScript SDKs and tools for building real-time communication applications. The project uses npm workspaces to manage multiple interconnected package. The API for the Browser SDK is dedicated to building WebRTC communication applications powered by the Signalwire signaling protocol (a.k.a Relay) over the WebSocket.

The API it's a newer API, known by "Call Fabric SDK" it's allows WebRTC applications to make a broader set of calls, using the "Call Fabric Address" abstraction. A Call Fabric Address could resolve to a PSNT call, a Sip Call, A SWML Call, Room(Conference) Call. This API is exposed @packages/client/src/index.ts

## Github Repository

https://github.com/signalwire/signalwire-js

## Essential Commands

### Building and Development

```bash
# Install dependencies (run from root)
npm i

# Build all packages in dependency order
npm run build

# Clean all build artifacts and node_modules
npm run clean

# Run unit tests
npm run test

# Run e2e tests
npm run -w=sw-internal/e2e-client dev
```

### Package-specific Development

```bash
# Core package development (shared utilities)
cd packages/core

# JS(Client) SDK development (Call Fabric SDK)
cd packages/client

# WebRTC development (Realtime Media Communications)
cs packages/webrtc
```

### Build

```bash
npm run build
```

### Testing

```bash
# Run all tests across workspaces
npm run test

# Run specific package tests
npm test -w @signalwire/core
npm test -w @signalwire/client
npm test -w @signalwire/webrt

# E2E testing
npm run -w=@sw-internal/e2e-js dev -- $TEST_SUITE #@internal/e2e-js/tests
```

### Development Playground

```bash
# Interactive examples and testing
cd internal/playground-client && npm run dev
```

### Changeset management

```bash
npm run changeset
```

## Architecture Overview

### Package Structure

- **@signalwire/core**: Shared utilities, Redux store, base classes, and common types
- **@signalwire/client**: Browser SDK for video, chat, and PubSub
- **@signalwire/webrtc**: WebRTC utilities and helpers

### Key Design Patterns

**Redux-based State Management**: [Deprecated] The SDK use Redux for state management with saga middleware for side effects. Core package provides the store configuration and common reducers.

**Instance State Management**: Based in instance variables of the components like `CallSession`

**Saga event channels**: Most of the SDK logic is executed as reactivity os Saga events

**Worker Pattern**: Event handling is organized using "workers" - saga functions that handle specific event types. Workers are located in `workers/` directories throughout packages.

**Component-based Architecture**:

1.  Component Enhancement Pattern

The SDK uses a sophisticated enhancement pattern where base functionality is extended through:

- connect(): Adds Redux integration and worker management
- extendComponent(): Dynamically adds methods to prototypes
- Factory functions: Create enhanced instances with additional capabilities

2. Event-Driven Communication

- Components communicate through events rather than direct method calls
- Redux actions trigger saga workers that emit domain-specific events
- Clear separation between internal Redux events and public API events

3. Worker-Based Side Effects

- All side effects (network calls, media operations) handled by saga workers
- Workers are component-specific (videoWorker, fabricWorker)
- Automatic cleanup and cancellation on component destruction

4. Layered Responsibility

- BaseSession: WebSocket management and authentication
- BaseConnection: WebRTC peer connection and media streams
- BaseRoomSession: Room-specific operations (screen share, audio)
- CallSession: Fabric specific operations

**Cross-environment Support**: Packages are built for multiple targets:

- Browser: ESM, CJS, and UMD bundles
- Node.js: CJS and ESM modules
- Platform-specific primitives (e.g., storage)

### Build System

The project uses custom build tools:

- **sw-build**: Core build tool using esbuild/Rollup with support for web, node, and UMD formats
- **sw-build-all**: Orchestrates building all packages in dependency order
- **sw-release**: Handles versioning and publishing workflows

### Key Directories Patterns

- `packages/*/src/`: Source code for each package
- `packages/*/workers/`: Redux saga workers for event handling
- `packages/*/types/`: TypeScript type definitions
- `internal/`: Development tools, testing, and examples
- `scripts/`: Custom build and release tools

### Testing Strategy

- **Unit tests**: Jest in each package
- **E2E tests**: Playwright for browser functionality (`internal/e2e-client`)
- **Manual testing**: Interactive playground (`internal/playground-client`)

## Development Notes

### Workflow

- create a new brach before any changes
- make a plan considering breaking changes impact, and the addition or fix is specific for the Call Fabric SDK or common; keep layers responsibility; protective code; follow existing patterns; testability
- implement the changes and tests
- execute all tests
- commit
- add a changeset

### TypeScript Configuration

- Root `tsconfig.json` with path mapping for internal package references
- Strict TypeScript settings with comprehensive type checking
- Each package has its own `tsconfig.build.json` for build-specific configuration

### Workspace Dependencies

When adding dependencies between @signalwire packages, update the path mappings in `tsconfig.json` and ensure proper build order in `sw-build-all`.

