# Refactoring Plan: Splitting @signalwire/js into @signalwire/browser-js and @signalwire/js

## Overview

This plan outlines the strategy to extract the Call Fabric SDK from the current @signalwire/js package into a new @signalwire/browser-js package, while maintaining the Video SDK in the original package.

## 1. New Package Structure

### **@signalwire/browser-js** (New Package - Call Fabric SDK)

```
packages/browser/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── jest.config.js
├── README.md
├── CHANGELOG.md
├── src/
│   ├── index.ts              # Exports: SignalWire, WebRTC namespaces
│   ├── fabric/               # Core Fabric SDK implementation
│   │   ├── CallSession.ts   # Renamed from FabricRoomSession
│   │   ├── CallSessionMember.ts # Renamed from FabricRoomSessionMember
│   │   ├── SignalWire.ts    # Main client
│   │   ├── WSClient.ts      # WebSocket client
│   │   ├── HTTPClient.ts    # REST API client
│   │   └── IncomingCallManager.ts
│   ├── types/               # Clean, explicit type definitions
│   │   ├── call.ts          # CallSession, CallMember interfaces
│   │   ├── events.ts        # Event type definitions
│   │   ├── adapters.ts      # Legacy Room type adapters
│   │   └── index.ts         # Public type exports
│   ├── conversation/        # Messaging/Chat functionality
│   ├── workers/            # All fabric workers
│   ├── interfaces/         # Internal interfaces
│   ├── utils/              # Fabric-specific utilities
│   └── webrtc.ts           # WebRTC utilities re-export
├── test/
│   └── setup.ts
└── dist/
```

### **@signalwire/js** (Existing Package - Video SDK Only)

```
packages/js/
├── src/
│   ├── index.ts              # Exports: Video, Chat, PubSub, WebRTC
│   ├── video/               # All current video/ contents
│   ├── chat/                # Remains for backward compatibility
│   ├── pubSub/              # Remains for backward compatibility
│   └── webrtc.ts            # WebRTC utilities export
```

### **@signalwire/browser-common** (New Shared Package)

```
packages/browser-common/
├── src/
│   ├── index.ts
│   ├── BaseRoomSession.ts
│   ├── Client.ts
│   ├── JWTSession.ts
│   ├── RoomSessionDevice.ts
│   ├── RoomSessionScreenShare.ts
│   ├── buildVideoElement.ts
│   ├── VideoOverlays.ts
│   ├── createClient.ts
│   ├── createRoomObject.ts
│   ├── utils/
│   │   ├── storage.ts
│   │   ├── audioElement.ts
│   │   ├── videoElement.ts
│   │   ├── constants.ts
│   │   ├── CloseEvent.ts
│   │   ├── makeQueryParamsUrl.ts
│   │   ├── paginatedResult.ts
│   │   └── roomSession.ts
│   └── test/
│       ├── setupTests.ts
│       └── testUtils.ts
```

## 2. WebRTC Utilities in Both SDKs

### Why Both SDKs Need WebRTC Utilities

Both the Video SDK and Call Fabric SDK need to expose WebRTC utilities to their users for common pre-call and in-call scenarios:

#### **Common Use Cases for WebRTC Utilities:**

1. **Device Selection UI**: Users need to enumerate cameras, microphones, and speakers to build device selection interfaces
2. **Permission Management**: Check and request media permissions before calls
3. **Pre-call Testing**: Test devices and media streams before joining a call
4. **Dynamic Device Switching**: Change devices during an active call
5. **Device Monitoring**: Watch for device changes (plug/unplug events)

#### **Example Usage in Call Fabric SDK:**

```typescript
import { SignalWire, WebRTC } from '@signalwire/browser-js'

// Pre-call device setup (same as Video SDK)
const cameras = await WebRTC.getCameraDevices()
const microphones = await WebRTC.getMicrophoneDevices()
const hasPermissions = await WebRTC.checkPermissions()

// Device selection UI
const selectedCamera = cameras[0]
const selectedMic = microphones[0]

// Then make a call through Call Fabric
const client = await SignalWire({ token: '...' })
const call = await client.dial({
  to: '/public/some-address',
  localStream: await WebRTC.getUserMedia({
    video: { deviceId: selectedCamera.deviceId },
    audio: { deviceId: selectedMic.deviceId },
  }),
})
```

The webrtc.ts file in both packages will be identical, re-exporting all utilities from @signalwire/webrtc.

## 3. Room to Call Renaming in Fabric SDK

### Rationale for Renaming

The Fabric SDK supports multiple call types beyond just conference rooms:
- PSTN calls (traditional phone calls)
- SIP calls (VoIP endpoints)
- SWML calls (script-driven calls)
- Room/Conference calls (multi-party WebRTC)

Using "Room" terminology is misleading as it implies only conference functionality. The "Call" terminology better represents the unified communication nature of the Fabric SDK.

### Naming Changes

#### Classes and Components
```typescript
// Current (in @signalwire/js)
FabricRoomSession → CallSession
FabricRoomSessionMember → CallSessionMember
BaseRoomSession → BaseRoomSession (unchanged in browser-common)
RoomSessionDevice → RoomSessionDevice (unchanged in browser-common)
RoomSessionScreenShare → RoomSessionScreenShare (unchanged in browser-common)

// New public API in @signalwire/browser-js
export class CallSession extends BaseRoomSession { ... }
export class CallSessionMember { ... }
```

**Important**: The BaseRoomSession and related classes in @signalwire/browser-common retain the "Room" naming for legacy compatibility, as they're shared with the Video SDK which legitimately uses room concepts. Only the Fabric SDK's public API adopts the "Call" terminology.

#### Event Names and Types
```typescript
// Internal events remain unchanged for compatibility
// Public event types get new names with adapters

// New clean event types
export interface CallJoinedEvent { ... }
export interface CallUpdatedEvent { ... }
export interface CallLeftEvent { ... }
export interface CallMemberJoinedEvent { ... }
export interface CallMemberUpdatedEvent { ... }
export interface CallMemberLeftEvent { ... }

// Type adapters for backward compatibility
export type RoomJoinedEvent = CallJoinedEvent
export type RoomUpdatedEvent = CallUpdatedEvent
// ... etc
```

### Type Schema Improvements

#### Current (Nested/Inferred Types)
```typescript
// Complex nested types that are hard to understand
export type FabricRoomEventParams = {
  room_session: Extract<
    InferredTypes<typeof fabricRoomSessionEventNames>,
    { updated: unknown }
  >['updated']
}
```

#### New Approach: Prettified Types with Utility Functions

Instead of manually defining static interfaces, we'll use TypeScript utility types to transform complex nested types into clean, readable structures:

```typescript
// Core utility type for prettifying complex types
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// Recursive version for deep type expansion
type DeepPrettify<T> = {
  [K in keyof T]: T[K] extends object
    ? T[K] extends (...args: any[]) => any
      ? T[K] // Keep functions as-is
      : DeepPrettify<T[K]>
    : T[K];
} & {};

// Transform complex core types into clean public types
export type CallSession = Prettify<
  Omit<InternalFabricRoomSession, 'internal_props'> & {
    // Add cleaner property names
    callId: string
    displayName: string
    members: CallMember[]
    startedAt: Date
  }
>

export type CallMember = DeepPrettify<
  Pick<
    FabricMemberEntity,
    'id' | 'memberId' | 'displayName' | 'visible' | 'audioMuted' | 'videoMuted'
  > & {
    callId: string
    nodeId: string
    type: 'member' | 'screen' | 'device'
    deaf: boolean
  }
>

// Transform event types while preserving structure
export type CallJoinedEventParams = Prettify<{
  call: CallSession
  member: CallMember
}>

// Utility type for cleaning up event handlers
type EventHandler<T> = T extends (...args: infer P) => infer R
  ? (...args: DeepPrettify<P>) => R
  : never

// Clean up complex event maps
export type CallEventHandlers = {
  [K in keyof InternalEventMap]: EventHandler<InternalEventMap[K]>
}
```

#### Benefits of This Approach

1. **Type Safety**: Maintains full type safety by deriving from source types
2. **DRY Principle**: No manual duplication of type definitions
3. **Automatic Updates**: Changes to core types automatically flow through
4. **IDE Experience**: Prettify expands types in tooltips for better readability
5. **Backwards Compatible**: Can map from internal complex types seamlessly

#### Implementation Requirements

1. Create a `types/utilities.ts` file with core utility types:
   ```typescript
   export type Prettify<T> = { [K in keyof T]: T[K] } & {}
   export type DeepPrettify<T> = { /* recursive implementation */ }
   export type SimplifyUnion<T> = T extends infer U ? U : never
   export type ExpandRecursively<T> = /* deep expansion logic */
   ```

2. Transform all exported types using these utilities:
   ```typescript
   // Instead of manual interface definitions
   export type CallSession = Prettify<DerivedCallSessionType>
   export type CallMember = Prettify<DerivedCallMemberType>
   ```

3. Add JSDoc comments to prettified types for documentation:
   ```typescript
   /**
    * Represents an active call session
    * @public
    */
   export type CallSession = Prettify<...>
   ```

### Legacy Compatibility Layer

```typescript
// packages/browser/src/fabric/types/adapters.ts

// Re-export Call types as Room types for backward compatibility
export type {
  CallSession as FabricRoomSession,
  CallSessionMember as FabricRoomSessionMember,
  CallJoinedEvent as RoomJoinedEvent,
  CallUpdatedEvent as RoomUpdatedEvent,
  // ... etc
}

// Deprecation notices
/** @deprecated Use CallSession instead */
export const FabricRoomSession = CallSession

/** @deprecated Use CallSessionMember instead */
export const FabricRoomSessionMember = CallSessionMember
```

### Developer Experience

```typescript
// Clean, intuitive API
import { SignalWire } from '@signalwire/browser-js'

const client = await SignalWire({ token })

// Listen for incoming calls
client.on('call.received', (call: CallSession) => {
  // call.answer() not call.joinRoom()
  await call.answer()
})

// Make outbound calls
const call = await client.dial({
  to: '/public/support',
  audio: true,
  video: true
})

// The 'call' object works for any call type
call.on('member.joined', (event: CallMemberJoinedEvent) => {
  console.log(`${event.member.displayName} joined the call`)
})
```

## 4. Namespace Simplification

### Current State in @signalwire/js
The current package exports both `Fabric` namespace and `SignalWire` as separate exports:
```typescript
export * as Fabric from './fabric'
export { SignalWire } from './fabric'
```

This creates confusion as users can access the same functionality through different paths:
```typescript
// Both work
import { Fabric } from '@signalwire/js'
import { SignalWire } from '@signalwire/js'

// Fabric.SignalWire === SignalWire (redundant)
const client1 = await Fabric.SignalWire({ token })
const client2 = await SignalWire({ token })
```

### New Approach in @signalwire/browser-js
Since the new package is dedicated exclusively to the Fabric SDK, we'll export only the `SignalWire` namespace:

```typescript
// packages/browser/src/index.ts
export * as SignalWire from './fabric'
export * as WebRTC from './webrtc'

// All Fabric functionality is under SignalWire namespace
export type {
  CallSession,
  CallSessionMember,
  CallJoinedEvent,
  // ... other types
} from './types'
```

### Benefits
1. **Cleaner API**: One clear entry point for all Fabric SDK functionality
2. **No Redundancy**: Eliminates the Fabric.SignalWire redundancy
3. **Better Branding**: SignalWire namespace aligns with company brand
4. **Simpler Imports**: Users have one obvious way to import functionality

### Usage Examples
```typescript
// Old way (in @signalwire/js)
import { Fabric } from '@signalwire/js'
const client = await Fabric.SignalWire({ token })

// New way (in @signalwire/browser-js)
import { SignalWire } from '@signalwire/browser-js'
const client = await SignalWire({ token })

// Types are exported at top level
import { CallSession, CallMember } from '@signalwire/browser-js'
```

## 5. Dependency Graph

```
@signalwire/core
    ├── @signalwire/webrtc
    │   └── @signalwire/browser-common (new)
    │       ├── @signalwire/browser-js (new - Fabric SDK)
    │       └── @signalwire/js (Video SDK)
    └── @signalwire/realtime-api (Node.js SDK - unchanged)
```

## 6. Migration Steps

### Phase 1: Create Common Package

1. Create @signalwire/browser-common package structure
2. Move shared components (BaseRoomSession, Client, etc.)
3. Update imports in both packages
4. Ensure all tests pass

### Phase 2: Create Browser Package

1. Create @signalwire/browser-js package structure
2. Move all fabric/ directory contents
3. Implement Room to Call renaming:
   - Rename FabricRoomSession → CallSession
   - Rename FabricRoomSessionMember → CallSessionMember
   - Update all references and imports
   - Create type adapters for backward compatibility
4. Create clean type definitions:
   - Define explicit interfaces instead of inferred types
   - Create clear event type hierarchies
   - Document all public types
5. Extract fabric-specific utilities and interfaces
6. Set up build configuration

### Phase 3: Update Original Package

1. Deprecate fabric exports from @signalwire/js
2. Update dependencies to use @signalwire/browser-common
3. Clean up unused imports and code
4. Update package.json

### Phase 4: Testing & Validation

1. Ensure all unit tests pass in all packages
2. Update e2e tests for new package structure
3. Verify playground examples work
4. Test backward compatibility layer

## 7. Breaking Changes & Migration Strategy

### For @signalwire/js Users:

```typescript
// Before (breaking changes)
import { Fabric, SignalWire } from '@signalwire/js'
const client = await Fabric.SignalWire({ token })
// or
const client = await SignalWire({ token })

// After
import { SignalWire } from '@signalwire/browser-js'
const client = await SignalWire({ token })

// WebRTC utilities remain available in both packages
import { WebRTC } from '@signalwire/js' // Video SDK users
import { WebRTC } from '@signalwire/browser-js' // Fabric SDK users

// Types are now top-level exports
import { CallSession, CallMember } from '@signalwire/browser-js'
```

### Backward Compatibility Option:

Create a compatibility layer in @signalwire/js that re-exports Fabric components with deprecation warnings:

```typescript
// packages/js/src/index.ts
import * as BrowserJS from '@signalwire/browser-js'

// Re-export SignalWire namespace as both Fabric and SignalWire for compatibility
export const Fabric = BrowserJS.SignalWire
export const SignalWire = BrowserJS.SignalWire

// Re-export types
export type * from '@signalwire/browser-js'

console.warn(
  'Fabric and SignalWire imports from @signalwire/js are deprecated. Please use @signalwire/browser-js instead.'
)
```

## 8. Test Coverage Requirements

### @signalwire/browser-common:

- 90%+ coverage for all shared utilities
- Integration tests for BaseRoomSession
- Mock tests for WebRTC components

### @signalwire/browser-js:

- 85%+ coverage for all Fabric components
- Worker saga tests
- HTTPClient and WSClient integration tests
- Conversation API tests
- Addresses API test

### @signalwire/js:

- Maintain existing Video SDK test coverage
- Update imports to use browser-common
- Remove Fabric-related tests

## 9. Build Configuration

Each package will use the existing sw-build tool with appropriate configurations:

```javascript
// packages/browser/sw.config.js
module.exports = {
  name: '@signalwire/browser-js',
  formats: ['esm', 'cjs', 'umd'],
  output: {
    umd: {
      name: 'SignalWire',
      file: 'browser-js.js',
    },
  },
  external: [
    '@signalwire/core',
    '@signalwire/webrtc',
    '@signalwire/browser-common',
  ],
}
```

## 10. Benefits

1. **Clear Separation**: Video SDK and Call Fabric SDK are completely independent
2. **Smaller Bundle Sizes**: Users only import what they need (though both include WebRTC utilities for practical reasons)
3. **Better Maintainability**: Each package has focused responsibilities
4. **Improved Testing**: Isolated test suites for each SDK
5. **Future Flexibility**: Easier to evolve each SDK independently
6. **Consistent Developer Experience**: WebRTC utilities available in both SDKs for device management needs
7. **Clearer API Semantics**: "Call" terminology better represents unified communications vs "Room" for conferences
8. **Better Type Safety**: Explicit interfaces replace complex inferred types
9. **Improved Developer Ergonomics**: Clean, well-documented types are easier to understand and use

## 11. Risks & Mitigation

1. **Breaking Changes**: Mitigate with compatibility layer and clear migration guide
2. **Increased Complexity**: Document clear dependency relationships
3. **Build Order**: Update sw-build-all to handle new dependencies
4. **Version Management**: Use changesets for coordinated releases

## 12. Timeline Estimate

- **Week 1-2**: Create browser-common package and migrate shared components
- **Week 3-4**: Create browser-js package and migrate Fabric SDK
- **Week 5**: Update original package and compatibility layer
- **Week 6**: Testing, documentation, and migration guide
- **Week 7**: Release preparation and coordination
