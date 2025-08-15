# Technical Specification: Simplified Dial API for Call Fabric SDK

## Document Information
- **Version**: 1.0.0
- **Date**: 2025-08-15
- **Author**: SignalWire Engineering Team
- **Status**: Draft
- **Project**: Call Fabric SDK - Outbound Call API Simplification

## Executive Summary

This specification outlines the simplification of the Call Fabric SDK's outbound call API by combining the current two-step process (`dial()` followed by `start()`) into a single, more semantic async `dial()` method that accepts optional event listeners during initialization.

## Current State

### Problem Statement

The current API requires developers to:
1. Call `client.dial(params)` to create a `CallSession` object
2. Attach event listeners to the `CallSession` instance
3. Call `callSession.start()` to initiate the call

This creates several issues:
- **Cognitive overhead**: Developers must remember the two-step process
- **Timing sensitivity**: Event listeners must be attached between `dial()` and `start()`
- **Potential event loss**: Early events may be missed if listeners aren't attached before calling `start()`
- **API inconsistency**: The method name `dial()` implies making a call, but it doesn't actually start one

### Current Implementation

```typescript
// Current usage pattern
const callSession = client.dial({
  to: '/public/alice',
  audio: true,
  video: true
});

callSession.on('call.joined', (event) => {
  console.log('Call joined:', event);
});

callSession.on('member.updated', (event) => {
  console.log('Member updated:', event);
});

await callSession.start();
```

## Proposed Solution

### New API Design

Transform `dial()` into an async method that:
1. Accepts optional event listeners in the parameters
2. Creates the `CallSession` internally
3. Attaches all provided event listeners
4. Calls `start()` automatically
5. Returns a promise that resolves to the started `CallSession`

### Proposed Usage Pattern

```typescript
// New simplified usage
const callSession = await client.dial({
  to: '/public/alice',
  audio: true,
  video: true,
  listen: {
    'call.joined': (event) => {
      console.log('Call joined:', event);
    },
    'member.updated': (event) => {
      console.log('Member updated:', event);
    }
  }
});

// CallSession is already started and event listeners are attached
```

## Detailed Design

### Type Definitions

```typescript
// Extended DialParams interface
interface DialParams {
  // Existing parameters
  to: string | Address;
  nodeId?: string;
  rootElement?: HTMLElement;
  applyLocalVideoOverlay?: boolean;
  stopCameraWhileMuted?: boolean;
  stopMicrophoneWhileMuted?: boolean;
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
  negotiateAudio?: boolean;
  negotiateVideo?: boolean;
  userVariables?: Record<string, any>;
  
  // NEW: Optional event listeners
  listen?: Partial<CallSessionEventHandlers>;
}

// Event handlers type mapping
type CallSessionEventHandlers = {
  [K in keyof CallSessionEvents]: (event: CallSessionEvents[K]) => void;
};

// Updated method signature
interface WSClient {

  // New async overload (with event listeners)
  dial(params: DialParams): Promise<CallSession>;
}
```

### Implementation Strategy

#### Phase 1: Interface Extension

1. **Extend DialParams Interface**
   ```typescript
   interface DialParams {
     // ... existing params
     listen?: Partial<CallSessionEventHandlers>;
   }
   ```

2. **Create Event Handler Types**
   ```typescript
   type CallSessionEventHandlers = {
     'call.joined': (event: CallJoinedEvent) => void;
     'call.state': (event: CallStateEvent) => void;
     'call.left': (event: CallLeftEvent) => void;
     'member.joined': (event: MemberJoinedEvent) => void;
     'member.updated': (event: MemberUpdatedEvent) => void;
     'member.left': (event: MemberLeftEvent) => void;
     'layout.changed': (event: LayoutChangedEvent) => void;
     'stream.started': (event: StreamStartedEvent) => void;
     'stream.ended': (event: StreamEndedEvent) => void;
     // ... all other events
   };
   ```

#### Phase 2: Method Implementation

```typescript

public async dial(params: DialParams): Promise<CallSession> {
  // Create the CallSession
  const callSession = this.buildOutboundCall(params);

  // Attach event listeners if provided
  if (params.listen) {
    for (const [eventName, handler] of Object.entries(params.listen)) {
      if (handler) {
        callSession.on(eventName as keyof CallSessionEvents, handler);
      }
    }
  }

  return callSession.start();

}
```

#### Phase 3: Error Handling

```typescript
public async dial(params: DialParams): Promise<CallSession> {
  const callSession = this.buildOutboundCall(params);

  try {
    // Attach event listeners
    if (params.listen) {
      this.attachEventListeners(callSession, params.listen);
    }

    // Start the call with error handling
    await callSession.start();

    return callSession;
  } catch (error) {
    // Clean up on failure
    callSession.destroy();

    // Re-throw with context
    throw new Error(`Failed to dial ${params.to}: ${error.message}`);
  }
}

private attachEventListeners(
  callSession: CallSession,
  handlers: Partial<CallSessionEventHandlers>
): void {
  for (const [eventName, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      try {
        callSession.on(eventName as keyof CallSessionEvents, handler);
      } catch (error) {
        console.warn(`Failed to attach listener for ${eventName}:`, error);
      }
    }
  }
}
```

## Implementation Details

### File Changes Required

1. **`packages/js/src/utils/interfaces/fabric.ts`**
   - Add `CallSessionEventHandlers` type
   - Extend `DialParams` interface

2. **`packages/js/src/fabric/WSClient.ts`**
   - refactor `dial()` method to be async
   - Add `attachEventListeners()` helper

3. **`packages/js/src/fabric/CallSession.ts`**
   - No changes required (existing event system works)

4. **`packages/js/src/index.ts`**
   - Update exported types

### Testing Strategy

#### Unit Tests

```typescript
describe('dial() with event listeners', () => {
  it('should accept event listeners in params', async () => {
    const onJoined = jest.fn();
    const onUpdated = jest.fn();

    const call = await client.dial({
      to: '/public/test',
      listen: {
        'call.joined': onJoined,
        'member.updated': onUpdated
      }
    });

    expect(call).toBeInstanceOf(CallSession);
    expect(onJoined).toHaveBeenCalled();
  });

  it('should work without event listeners', async () => {
    const call = await client.dial({ to: '/public/test' });
    expect(call).toBeInstanceOf(CallSession);
    // Call is already started, no need to call start()
  });

  it('should handle errors during dial', async () => {
    await expect(client.dial({
      to: '/invalid/address',
      listen: { 'call.joined': jest.fn() }
    })).rejects.toThrow();
  });
});
```

#### e2e Test

Replicate the existing e2e adding new implementations the use the new API.
Pay attention to replace the event test implementation patterns with this a new pattern that is compatible with the new API.

**This Pattern needs to be replaced**
```typescript
// old event test patterns

//create a new promise that resolves when the event is received before execution an method.
const memberUpdatedMuted = new Promise((resolve) => {
          const memberUpdatedEvent = new Promise((res) => {
            callObj.on('member.updated', (params) => {
              if (
                params.member.member_id === callSession.member_id &&
                params.member.updated.includes('audio_muted') &&
                params.member.audio_muted === true
              ) {
                res(true)
              }
            })
          })

// execute the method callObj.mute(...)

// await memberUpdatedMuted
```

**This is the new event test pattern**

```
const memberUpdateCompleter = new Promise.withResolvers()


const callObj = dial(..., listen:{'member.updated': memberUpdatedMuted.resolve})

// execute the method callObj.mute()
const memberUpdateCompleterTimeout = setTimeout(() => memberUpdatedMuted.reject(), 5000)
const memberUpdate = await memberUpdateCompleter.promise

// expect memberUpdate values
```

### Performance Considerations

1. **Memory Impact**: Minimal - only stores function references
2. **CPU Impact**: Negligible - O(n) where n is number of listeners
3. **Network Impact**: None - same WebRTC negotiation process
4. **Startup Time**: Slightly improved - eliminates user-side async coordination

## Security Considerations

1. **Event Handler Validation**: Ensure handlers are functions before attachment
2. **Error Isolation**: Handler errors shouldn't crash the SDK
3. **Memory Leaks**: Proper cleanup of listeners on call termination
4. **Type Safety**: Strong typing prevents invalid event names

## Documentation Updates

### API Reference

```typescript
/**
 * Initiates an outbound call with optional event listeners.
 *
 * @param params - Call configuration parameters
 * @returns Promise<CallSession> - The started CallSession instance
 *
 *
 * @example
 * // New simplified usage with event listeners
 * const call = await client.dial({
 *   to: '/public/alice',
 *   listen: {
 *     'call.joined': (event) => console.log('Joined:', event),
 *     'member.updated': (event) => console.log('Updated:', event)
 *   }
 * });
 */
dial(params: DialParams):  Promise<CallSession>;
```

### Migration Guide

```markdown
## Migrating to the New dial() API

### Before
const call = client.dial({ to: '/public/alice' });
call.on('call.joined', handleJoined);
call.on('member.updated', handleUpdate);
await call.start();

### After
const call = await client.dial({
  to: '/public/alice',
  listen: {
    'call.joined': handleJoined,
    'member.updated': handleUpdate
  }
});

### Benefits
- Single async call instead of multiple steps
- No risk of missing early events
- More semantic API - dial() actually dials
- Cleaner, more readable code
```


## Alternative Approaches Considered

### 1. Builder Pattern
```typescript
const call = await client
  .dial({ to: '/public/alice' })
  .listen('call.joined', handler)
  .listen('member.updated', handler)
  .start();
```
**Rejected**: More complex API, harder to type properly

### 2. Separate Async Method
```typescript
const call = await client.dialAndStart({
  to: '/public/alice',
  listen: { /* handlers */ }
});
```
**Rejected**: Creates API fragmentation, less intuitive

### 3. Configuration Object
```typescript
const call = await client.dial({
  config: { to: '/public/alice' },
  handlers: { /* event handlers */ }
});
```
**Rejected**: Unnecessarily nested structure

## Success Criteria

1. **Functionality**: New API works correctly with all event types
2. **Compatibility**: Zero breaking changes for existing code
3. **Performance**: No performance regression vs current implementation
4. **Adoption**: 50% of new code uses simplified API within 6 months
5. **Developer Satisfaction**: Positive feedback from developer survey

## Appendix

### A. Complete Event List

All events that can be passed in the `listen` parameter:

- `call.joined` - Call successfully joined
- `call.state` - Call state changed
- `call.left` - Call ended
- `call.updated` - Call metadata updated
- `member.joined` - Participant joined
- `member.left` - Participant left
- `member.updated` - Participant state changed
- `member.talking` - Participant talking state changed
- `layout.changed` - Video layout changed
- `stream.started` - Media stream started
- `stream.ended` - Media stream ended
- `playback.started` - Audio playback started
- `playback.ended` - Audio playback ended
- `recording.started` - Recording started
- `recording.ended` - Recording ended
- `room.subscribed` - Room subscription active
- `room.unsubscribed` - Room subscription ended

### B. Code Examples


#### Call with Event Handlers
```typescript
const call = await client.dial({
  to: '/public/alice',
  audio: true,
  video: true,
  listen: {
    'call.joined': ({ roomId, memberId }) => {
      console.log(`Joined room ${roomId} as ${memberId}`);
    },
    'member.joined': ({ member }) => {
      console.log(`${member.name} joined the call`);
    },
    'member.left': ({ member }) => {
      console.log(`${member.name} left the call`);
    }
  }
});
```

#### Advanced Configuration
```typescript
const call = await client.dial({
  to: '/public/conference',
  audio: { echoCancellation: true },
  video: { width: 1280, height: 720 },
  rootElement: document.getElementById('video-container'),
  userVariables: { department: 'sales' },
  listen: {
    'call.joined': handleCallJoined,
    'call.state': handleCallState,
    'member.updated': handleMemberUpdate,
    'layout.changed': handleLayoutChange
  }
});
```

### C. References

- [Current Call Fabric SDK Documentation](https://docs.signalwire.com/sdks/javascript)
- [WebRTC Specification](https://www.w3.org/TR/webrtc/)
- [EventEmitter Pattern](https://nodejs.org/api/events.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**End of Specification**
