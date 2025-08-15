# Migration Guide: Old dial() Pattern to New dial() API

## Overview

This guide helps you migrate from the old two-step dial pattern to the new simplified dial API with event listeners.

## Quick Migration Checklist

- [ ] Replace `client.dial()` + `call.start()` with single `await client.dial()`
- [ ] Move event handlers from `.on()` calls to `listen` parameter
- [ ] Update error handling to use try/catch around dial()
- [ ] Remove manual `start()` calls
- [ ] Update TypeScript types if needed

## Side-by-Side Comparison

### Basic Call

**Before (Old Pattern)**
```typescript
// ❌ Old way - multiple steps, timing issues
const callSession = client.dial({
  to: '/public/meeting-room',
  audio: true,
  video: true
})

callSession.on('call.joined', (params) => {
  console.log('Call joined:', params)
})

callSession.on('member.updated', (params) => {
  console.log('Member updated:', params)
})

await callSession.start()
```

**After (New Pattern)**
```typescript
// ✅ New way - single step, no timing issues
const call = await client.dial({
  to: '/public/meeting-room',
  audio: true,
  video: true,
  listen: {
    'call.joined': (params) => {
      console.log('Call joined:', params)
    },
    'member.updated': (params) => {
      console.log('Member updated:', params)
    }
  }
})
```

### Error Handling

**Before (Old Pattern)**
```typescript
// ❌ Error handling was scattered across multiple stages
try {
  const callSession = client.dial({
    to: '/public/room',
    audio: true,
    video: true
  })

  callSession.on('call.joined', handleJoined)
  callSession.on('call.state', (params) => {
    if (params.call_state === 'ended' && params.error) {
      handleError(params.error)
    }
  })

  await callSession.start() // This could fail
} catch (error) {
  // Only catches dial() creation errors, not start() errors
  console.error('Dial failed:', error)
}
```

**After (New Pattern)**
```typescript
// ✅ Centralized error handling
try {
  const call = await client.dial({
    to: '/public/room',
    audio: true,
    video: true,
    listen: {
      'call.joined': handleJoined,
      'call.state': (params) => {
        if (params.call_state === 'ended' && params.error) {
          handleError(params.error)
        }
      }
    }
  })
} catch (error) {
  // Catches all dial-related errors
  console.error('Dial failed:', error)
}
```

## Migration Patterns

### Pattern 1: Simple Event Handlers

**Before**
```typescript
const call = client.dial(params)

call.on('call.joined', (params) => {
  updateUI('connected')
})

call.on('call.left', (params) => {
  updateUI('disconnected')
})

call.on('member.joined', (params) => {
  addMember(params.member)
})

await call.start()
```

**After**
```typescript
const call = await client.dial({
  ...params,
  listen: {
    'call.joined': (params) => {
      updateUI('connected')
    },
    'call.left': (params) => {
      updateUI('disconnected')
    },
    'member.joined': (params) => {
      addMember(params.member)
    }
  }
})
```

### Pattern 2: Conditional Event Attachment

**Before**
```typescript
const call = client.dial(params)

// Conditional event handlers
if (isModeratorMode) {
  call.on('member.joined', handleModeratorMemberJoined)
} else {
  call.on('member.joined', handleRegularMemberJoined)
}

if (enableRecording) {
  call.on('recording.started', handleRecordingStarted)
}

await call.start()
```

**After**
```typescript
// Prepare event handlers conditionally
const eventHandlers = {
  'member.joined': isModeratorMode 
    ? handleModeratorMemberJoined 
    : handleRegularMemberJoined
}

if (enableRecording) {
  eventHandlers['recording.started'] = handleRecordingStarted
}

const call = await client.dial({
  ...params,
  listen: eventHandlers
})
```

### Pattern 3: Async Event Handlers

**Before**
```typescript
const call = client.dial(params)

call.on('call.joined', async (params) => {
  await initializeCallResources()
  await updateDatabase(params)
})

call.on('member.joined', async (params) => {
  await logMemberJoin(params.member)
})

await call.start()
```

**After**
```typescript
const call = await client.dial({
  ...params,
  listen: {
    'call.joined': async (params) => {
      await initializeCallResources()
      await updateDatabase(params)
    },
    'member.joined': async (params) => {
      await logMemberJoin(params.member)
    }
  }
})
```

### Pattern 4: Dynamic Event Handler Addition

**Before**
```typescript
const call = client.dial(params)

// Add initial handlers
call.on('call.joined', handleJoined)

// Add more handlers based on call state
call.on('call.joined', (params) => {
  if (params.room_session.recording) {
    call.on('recording.updated', handleRecordingUpdate)
  }
})

await call.start()
```

**After**
```typescript
const call = await client.dial({
  ...params,
  listen: {
    'call.joined': (params) => {
      handleJoined(params)
      
      // Add additional handlers after join if needed
      if (params.room_session.recording) {
        call.on('recording.updated', handleRecordingUpdate)
      }
    }
  }
})
```

## Complex Migration Examples

### Example 1: Conference App

**Before**
```typescript
async function joinConference(roomName) {
  const call = client.dial({
    to: roomName,
    audio: true,
    video: true,
    rootElement: document.getElementById('video-container')
  })

  // Member management
  call.on('member.joined', (params) => {
    addMemberToList(params.member)
    updateMemberCount()
  })

  call.on('member.left', (params) => {
    removeMemberFromList(params.member.member_id)
    updateMemberCount()
  })

  // Audio/Video state
  call.on('member.updated.audioMuted', (params) => {
    updateMemberAudioIcon(params.member)
  })

  call.on('member.updated.videoMuted', (params) => {
    updateMemberVideoIcon(params.member)
  })

  // Call state
  call.on('call.joined', (params) => {
    showCallControls()
    setCallStatus('Connected')
  })

  call.on('call.left', (params) => {
    hideCallControls()
    setCallStatus('Disconnected')
    cleanupResources()
  })

  try {
    await call.start()
    return call
  } catch (error) {
    console.error('Failed to start call:', error)
    throw error
  }
}
```

**After**
```typescript
async function joinConference(roomName) {
  try {
    const call = await client.dial({
      to: roomName,
      audio: true,
      video: true,
      rootElement: document.getElementById('video-container'),
      listen: {
        // Member management
        'member.joined': (params) => {
          addMemberToList(params.member)
          updateMemberCount()
        },
        
        'member.left': (params) => {
          removeMemberFromList(params.member.member_id)
          updateMemberCount()
        },
        
        // Audio/Video state
        'member.updated.audioMuted': (params) => {
          updateMemberAudioIcon(params.member)
        },
        
        'member.updated.videoMuted': (params) => {
          updateMemberVideoIcon(params.member)
        },
        
        // Call state
        'call.joined': (params) => {
          showCallControls()
          setCallStatus('Connected')
        },
        
        'call.left': (params) => {
          hideCallControls()
          setCallStatus('Disconnected')
          cleanupResources()
        }
      }
    })
    
    return call
  } catch (error) {
    console.error('Failed to start call:', error)
    throw error
  }
}
```

### Example 2: React Component

**Before**
```typescript
// React component with old pattern
function CallComponent({ destination }) {
  const [call, setCall] = useState(null)
  const [callState, setCallState] = useState('idle')

  const startCall = useCallback(async () => {
    try {
      const newCall = client.dial({
        to: destination,
        audio: true,
        video: true
      })

      newCall.on('call.joined', (params) => {
        setCallState('connected')
        setCall(newCall)
      })

      newCall.on('call.state', (params) => {
        setCallState(params.call_state)
      })

      newCall.on('call.left', () => {
        setCallState('ended')
        setCall(null)
      })

      await newCall.start()
    } catch (error) {
      console.error('Call failed:', error)
      setCallState('error')
    }
  }, [destination])

  // ... rest of component
}
```

**After**
```typescript
// React component with new pattern
function CallComponent({ destination }) {
  const [call, setCall] = useState(null)
  const [callState, setCallState] = useState('idle')

  const startCall = useCallback(async () => {
    try {
      const newCall = await client.dial({
        to: destination,
        audio: true,
        video: true,
        listen: {
          'call.joined': (params) => {
            setCallState('connected')
            setCall(newCall)
          },
          
          'call.state': (params) => {
            setCallState(params.call_state)
          },
          
          'call.left': () => {
            setCallState('ended')
            setCall(null)
          }
        }
      })
    } catch (error) {
      console.error('Call failed:', error)
      setCallState('error')
    }
  }, [destination])

  // ... rest of component
}
```

## Testing Migration

### Old Pattern Tests

```typescript
// ❌ Old pattern tests were complex due to timing
it('should handle call events', async () => {
  const call = client.dial(params)
  
  const joinedPromise = new Promise((resolve) => {
    call.on('call.joined', resolve)
  })
  
  await call.start()
  
  const joinedEvent = await joinedPromise
  expect(joinedEvent).toBeDefined()
})
```

### New Pattern Tests

```typescript
// ✅ New pattern tests are simpler
it('should handle call events', async () => {
  const joinedPromise = new Promise((resolve) => {
    client.dial({
      ...params,
      listen: {
        'call.joined': resolve
      }
    })
  })
  
  const joinedEvent = await joinedPromise
  expect(joinedEvent).toBeDefined()
})

// Even better with modern testing
it('should handle call events', async () => {
  const handleJoined = jest.fn()
  
  await client.dial({
    ...params,
    listen: {
      'call.joined': handleJoined
    }
  })
  
  expect(handleJoined).toHaveBeenCalled()
})
```

## Common Migration Issues

### Issue 1: Event Handler Scope

**Problem**: Event handlers in the old pattern could access variables that might be stale

**Before**
```typescript
let currentUser = getUserData()

const call = client.dial(params)
call.on('member.joined', (params) => {
  // currentUser might be stale
  if (params.member.name === currentUser.name) {
    // ...
  }
})

// Later...
currentUser = getUpdatedUserData()
await call.start()
```

**Solution**: Use fresh data or pass context explicitly

**After**
```typescript
const call = await client.dial({
  ...params,
  listen: {
    'member.joined': (params) => {
      // Get fresh data when needed
      const currentUser = getUserData()
      if (params.member.name === currentUser.name) {
        // ...
      }
    }
  }
})
```

### Issue 2: Event Handler Dependencies

**Problem**: Event handlers that depend on external state

**Before**
```typescript
const modalRef = useRef()

const call = client.dial(params)
call.on('member.joined', (params) => {
  // modalRef might not be current
  modalRef.current?.show()
})

await call.start()
```

**Solution**: Use callbacks or ensure stable references

**After**
```typescript
const showModal = useCallback(() => {
  modalRef.current?.show()
}, [])

const call = await client.dial({
  ...params,
  listen: {
    'member.joined': (params) => {
      showModal()
    }
  }
})
```

### Issue 3: Error Recovery

**Problem**: Old pattern made error recovery complex

**Before**
```typescript
const call = client.dial(params)

call.on('call.joined', handleJoined)

try {
  await call.start()
} catch (error) {
  // Hard to recover - call object might be in bad state
  console.error('Start failed:', error)
}
```

**Solution**: New pattern provides cleaner error boundaries

**After**
```typescript
try {
  const call = await client.dial({
    ...params,
    listen: {
      'call.joined': handleJoined
    }
  })
} catch (error) {
  // Clean error state - can retry easily
  console.error('Dial failed:', error)
  // Retry or show error message
}
```

## Performance Considerations

### Before vs After

**Memory Usage**: 
- Old: Potential memory leaks if events aren't cleaned up properly
- New: Automatic cleanup when call ends

**Event Timing**:
- Old: Risk of missing early events
- New: All events captured from the start

**Error Handling**:
- Old: Multiple error points (dial, start, events)
- New: Single error boundary

## Migration Checklist

### For Each Call Location

1. **Find all `client.dial()` calls**
   ```bash
   grep -r "\.dial(" src/
   ```

2. **Identify corresponding `.start()` calls**
   ```bash
   grep -r "\.start()" src/
   ```

3. **Find event handler attachments**
   ```bash
   grep -r "\.on(" src/
   ```

4. **Update each location:**
   - [ ] Combine dial + start into single `await client.dial()`
   - [ ] Move `.on()` calls to `listen` parameter
   - [ ] Update error handling
   - [ ] Remove `.start()` calls
   - [ ] Test the migration

### For TypeScript Projects

1. **Update import types**
   ```typescript
   import type { 
     CallSessionEventHandlers,
     DialParams 
   } from '@signalwire/core'
   ```

2. **Update type annotations**
   ```typescript
   const eventHandlers: Partial<CallSessionEventHandlers> = {
     'call.joined': (params) => { /* typed params */ }
   }
   ```

3. **Update function signatures**
   ```typescript
   // Before
   function startCall(): Promise<void>
   
   // After  
   function startCall(): Promise<CallSession>
   ```

## Automated Migration

### Using AST Transformations

You can use tools like `jscodeshift` to automate parts of the migration:

```javascript
// migrate-dial.js
module.exports = function transformer(file, api) {
  const j = api.jscodeshift
  
  return j(file.source)
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'dial' }
      }
    })
    .forEach(path => {
      // Transform dial() calls
      // This is a simplified example
    })
    .toSource()
}
```

### Usage
```bash
npx jscodeshift -t migrate-dial.js src/
```

## Conclusion

The migration from the old dial pattern to the new API provides:

- **Simpler code**: Single async call instead of multiple steps
- **Better reliability**: No timing issues with event handlers
- **Improved error handling**: Single try/catch block
- **Better developer experience**: More intuitive API

The migration is straightforward for most cases and provides immediate benefits in code clarity and reliability.

For complex cases or if you need assistance, refer to the comprehensive examples in:
- [`dial-with-events.ts`](./dial-with-events.ts)
- [`dial-with-events.js`](./dial-with-events.js)
- [`dial-api-documentation.md`](./dial-api-documentation.md)