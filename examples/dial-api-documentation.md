# Call Fabric SDK - Simplified dial() API Documentation

## Overview

The Call Fabric SDK now provides a simplified `dial()` API that combines call initiation with event listener attachment in a single async method call. This eliminates the need for the previous two-step process and prevents timing issues with event handling.

## Table of Contents

- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Event Types](#event-types)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)

## Quick Start

```typescript
import { SignalWire } from '@signalwire/client'

// 1. Create client
const client = await SignalWire({
  host: 'your-space.signalwire.com',
  token: 'your-access-token'
})

// 2. Dial with event listeners - call starts automatically!
const call = await client.dial({
  to: '/public/conference-room',
  audio: true,
  video: true,
  listen: {
    'call.joined': (params) => {
      console.log('Call joined!', params)
    },
    'member.joined': (params) => {
      console.log('Member joined:', params.member.name)
    }
  }
})

// Call is already started and ready to use
console.log('Call ID:', call.id)
```

## API Reference

### `client.dial(params: DialParams): Promise<CallSession>`

Initiates an outbound call with optional event listeners and returns a Promise that resolves to a started `CallSession` instance.

#### Parameters

```typescript
interface DialParams {
  // Required
  to: string                              // Destination address (e.g., '/public/room-name')
  
  // Media Configuration
  audio?: boolean | MediaTrackConstraints // Audio settings (default: true)
  video?: boolean | MediaTrackConstraints // Video settings (default: false)
  negotiateAudio?: boolean               // Negotiate incoming audio (default: true)
  negotiateVideo?: boolean               // Negotiate incoming video (default: based on video setting)
  
  // UI Configuration
  rootElement?: HTMLElement              // Container for video elements
  applyLocalVideoOverlay?: boolean       // Show local video overlay (default: true)
  applyMemberOverlay?: boolean           // Show member overlays (default: true)
  mirrorLocalVideoOverlay?: boolean      // Mirror local video (default: false)
  
  // Behavior Configuration
  stopCameraWhileMuted?: boolean         // Stop camera when video muted (default: true)
  stopMicrophoneWhileMuted?: boolean     // Stop microphone when audio muted (default: true)
  
  // Advanced
  nodeId?: string                        // Specific node for routing
  userVariables?: Record<string, any>    // Custom metadata
  fromCallAddressId?: string             // Source address ID
  
  // Event Listeners (NEW!)
  listen?: Partial<CallSessionEventHandlers>  // Event handlers to attach
}
```

#### Returns

- **Type**: `Promise<CallSession>`
- **Description**: A Promise that resolves to a started CallSession instance with all event listeners attached

#### Throws

- `Error` - If call initiation fails (authentication, network, permissions, etc.)

## Event Types

### Core Call Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `call.joined` | `CallJoinedEventParams` | Call successfully established |
| `call.state` | `CallStateEventParams` | Call state changed (created, ringing, answered, ending, ended) |
| `call.left` | `CallLeftEventParams` | Participant left the call |
| `call.updated` | `CallUpdatedEventParams` | Call metadata updated |

### Member Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `member.joined` | `MemberJoinedEventParams` | New participant joined |
| `member.left` | `MemberLeftEventParams` | Participant left |
| `member.updated` | `MemberUpdatedEventParams` | Member state changed |
| `member.talking` | `MemberTalkingEventParams` | Talking state changed |

### Granular Member Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `member.updated.audioMuted` | `MemberUpdatedEventParams` | Audio mute state changed |
| `member.updated.videoMuted` | `MemberUpdatedEventParams` | Video mute state changed |
| `member.updated.handraised` | `MemberUpdatedEventParams` | Hand raised/lowered |
| `member.updated.deaf` | `MemberUpdatedEventParams` | Deaf state changed |
| `member.updated.visible` | `MemberUpdatedEventParams` | Visibility changed |

### Media & Layout Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `layout.changed` | `CallLayoutChangedEventParams` | Video layout changed |
| `stream.started` | `VideoStreamStartedEventParams` | Media stream started |
| `stream.ended` | `VideoStreamEndedEventParams` | Media stream ended |

### Recording & Playback Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `recording.started` | `VideoRecordingStartedEventParams` | Recording started |
| `recording.ended` | `VideoRecordingEndedEventParams` | Recording ended |
| `playback.started` | `VideoPlaybackStartedEventParams` | Media playback started |
| `playback.ended` | `VideoPlaybackEndedEventParams` | Media playback ended |

### Room Events

| Event Name | Parameters | Description |
|------------|------------|-------------|
| `room.subscribed` | `CallJoinedEventParams` | Subscribed to room events |
| `room.left` | `CallLeftEventParams` | Left the room |

## Migration Guide

### Before (Old Pattern)

```typescript
// ❌ Old way - multiple steps, timing-sensitive
const callSession = client.dial({
  to: '/public/room',
  audio: true,
  video: true
})

// Event listeners must be attached before start()
callSession.on('call.joined', handleJoined)
callSession.on('member.updated', handleMemberUpdate)

// Start the call (risk of missing early events)
await callSession.start()
```

### After (New Pattern)

```typescript
// ✅ New way - single step, no timing issues
const call = await client.dial({
  to: '/public/room',
  audio: true,
  video: true,
  listen: {
    'call.joined': handleJoined,
    'member.updated': handleMemberUpdate
  }
})

// Call is already started!
```

### Benefits of Migration

1. **Simplified API**: Single async method instead of multiple steps
2. **No Timing Issues**: Events cannot be missed during initialization
3. **Better Error Handling**: Failures are caught in a single try/catch
4. **Cleaner Code**: More semantic and readable
5. **Type Safety**: Better TypeScript support for event handlers

## Best Practices

### 1. Essential Event Handlers

Always include these core event handlers for a robust application:

```typescript
const call = await client.dial({
  to: destination,
  audio: true,
  video: true,
  listen: {
    // Essential for call lifecycle
    'call.joined': (params) => {
      console.log('Call established')
      updateUI('connected')
    },
    
    'call.state': (params) => {
      console.log('Call state:', params.call_state)
      updateCallStatus(params.call_state)
    },
    
    'call.left': (params) => {
      console.log('Call ended')
      cleanupUI()
    },
    
    // Essential for member management
    'member.joined': (params) => {
      console.log('Member joined:', params.member.name)
      addMemberToUI(params.member)
    },
    
    'member.left': (params) => {
      console.log('Member left:', params.member.name)
      removeMemberFromUI(params.member.member_id)
    }
  }
})
```

### 2. Error Handling

Always wrap dial() calls in try/catch blocks:

```typescript
try {
  const call = await client.dial({
    to: destination,
    listen: {
      'call.joined': handleJoined,
      'call.state': (params) => {
        // Handle error states
        if (params.call_state === 'ended' && params.error) {
          handleCallError(params.error)
        }
      }
    }
  })
} catch (error) {
  console.error('Failed to dial:', error)
  showErrorMessage('Could not start call')
}
```

### 3. Granular Event Handling

Use specific events for better UX:

```typescript
const call = await client.dial({
  to: destination,
  listen: {
    // Use granular events for immediate UI updates
    'member.updated.audioMuted': (params) => {
      updateMemberAudioIcon(params.member.member_id, params.member.audio_muted)
    },
    
    'member.updated.videoMuted': (params) => {
      updateMemberVideoIcon(params.member.member_id, params.member.video_muted)
    },
    
    'member.updated.handraised': (params) => {
      if (params.member.hand_raised) {
        showHandRaisedNotification(params.member.name)
      }
    }
  }
})
```

### 4. Memory Management

Event handlers are automatically cleaned up when the call ends, but avoid closures that capture large objects:

```typescript
// ❌ Avoid - captures large objects
const heavyData = getLargeDataSet()
const call = await client.dial({
  listen: {
    'member.joined': (params) => {
      // This captures heavyData in closure
      processWithHeavyData(params, heavyData)
    }
  }
})

// ✅ Better - use references or pass data explicitly
const call = await client.dial({
  listen: {
    'member.joined': handleMemberJoined
  }
})

function handleMemberJoined(params) {
  const data = getLargeDataSet() // Get data when needed
  processWithHeavyData(params, data)
}
```

## Error Handling

### Common Error Scenarios

1. **Authentication Failure**
   ```typescript
   catch (error) {
     if (error.message.includes('Authentication')) {
       showError('Invalid token. Please check your credentials.')
     }
   }
   ```

2. **Permission Denied**
   ```typescript
   catch (error) {
     if (error.message.includes('Permission')) {
       showError('Please allow camera/microphone access.')
     }
   }
   ```

3. **Network Issues**
   ```typescript
   catch (error) {
     if (error.message.includes('Network')) {
       showError('Network error. Please check your connection.')
     }
   }
   ```

4. **Invalid Destination**
   ```typescript
   catch (error) {
     if (error.message.includes('Invalid destination')) {
       showError('The destination address is not valid.')
     }
   }
   ```

### Graceful Degradation

```typescript
try {
  // Try with full features
  const call = await client.dial({
    to: destination,
    audio: true,
    video: true,
    listen: eventHandlers
  })
} catch (error) {
  try {
    // Fallback to audio-only
    const call = await client.dial({
      to: destination,
      audio: true,
      video: false,
      listen: {
        'call.joined': () => {
          showNotification('Connected in audio-only mode')
        }
      }
    })
  } catch (fallbackError) {
    showError('Unable to connect to call')
  }
}
```

## Advanced Usage

### Custom Media Constraints

```typescript
const call = await client.dial({
  to: '/public/hd-conference',
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000
  },
  video: {
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30, min: 15 },
    facingMode: 'user'
  },
  listen: {
    'call.joined': (params) => {
      console.log('HD call established')
    }
  }
})
```

### User Variables and Metadata

```typescript
const call = await client.dial({
  to: '/public/support-room',
  userVariables: {
    customerType: 'premium',
    ticketId: 'TICKET-12345',
    department: 'technical-support',
    agentSkills: ['networking', 'troubleshooting']
  },
  listen: {
    'call.joined': (params) => {
      // User variables are available in the session
      console.log('Support call with metadata:', params.userVariables)
    }
  }
})
```

### Conditional Event Handling

```typescript
const call = await client.dial({
  to: destination,
  listen: {
    'member.joined': (params) => {
      const member = params.member
      
      // Handle different member types
      if (member.name.includes('[BOT]')) {
        handleBotMember(member)
      } else if (member.permissions?.includes('moderator')) {
        handleModeratorJoined(member)
      } else {
        handleRegularMember(member)
      }
    },
    
    'member.updated': (params) => {
      // Only handle updates for specific members
      if (params.member.member_id === call.memberId) {
        handleSelfUpdate(params)
      } else {
        handleOtherMemberUpdate(params)
      }
    }
  }
})
```

## Examples

### Basic Video Conference

```typescript
const call = await client.dial({
  to: '/public/team-meeting',
  audio: true,
  video: true,
  rootElement: document.getElementById('video-container'),
  listen: {
    'call.joined': (params) => {
      document.getElementById('status').textContent = 'Connected'
      document.getElementById('member-count').textContent = 
        params.room_session.members.length
    },
    
    'member.joined': (params) => {
      updateMemberCount(params.room_session.members.length)
      showNotification(`${params.member.name} joined`)
    },
    
    'member.left': (params) => {
      updateMemberCount(params.room_session.members.length)
      showNotification(`${params.member.name} left`)
    }
  }
})
```

### Customer Support Call

```typescript
const call = await client.dial({
  to: '/public/support-123',
  audio: true,
  video: false,
  userVariables: {
    ticketId: 'SUPPORT-456',
    customerTier: 'enterprise'
  },
  listen: {
    'call.joined': (params) => {
      startCallRecording()
      displayCustomerInfo()
    },
    
    'member.joined': (params) => {
      if (params.member.member_id !== call.memberId) {
        greetCustomer(params.member.name)
      }
    },
    
    'call.left': (params) => {
      saveCallSummary({
        duration: call.duration,
        resolution: getCurrentResolution()
      })
    }
  }
})
```

### Conference with Moderation

```typescript
const call = await client.dial({
  to: '/public/webinar-main',
  audio: true,
  video: true,
  userVariables: { role: 'moderator' },
  listen: {
    'call.joined': (params) => {
      enableModeratorControls()
      
      // Auto-mute all participants except moderator
      params.room_session.members
        .filter(m => m.member_id !== call.memberId)
        .forEach(member => {
          call.audioMute({ memberId: member.member_id })
        })
    },
    
    'member.joined': (params) => {
      // Auto-mute new participants
      if (params.member.member_id !== call.memberId) {
        call.audioMute({ memberId: params.member.member_id })
      }
    },
    
    'member.updated.handraised': (params) => {
      if (params.member.hand_raised) {
        showModeratorNotification(
          `${params.member.name} raised hand`,
          [
            { text: 'Unmute', action: () => 
              call.audioUnmute({ memberId: params.member.member_id }) 
            }
          ]
        )
      }
    }
  }
})
```

## TypeScript Support

### Type-Safe Event Handlers

```typescript
import type { 
  CallJoinedEventParams,
  MemberJoinedEventParams,
  CallSessionEventHandlers 
} from '@signalwire/core'

// Define strongly typed handlers
const eventHandlers: Partial<CallSessionEventHandlers> = {
  'call.joined': (params: CallJoinedEventParams) => {
    // TypeScript ensures params has correct shape
    console.log(params.room_session.name)
  },
  
  'member.joined': (params: MemberJoinedEventParams) => {
    // Auto-completion and type checking
    console.log(params.member.name)
  }
}

const call = await client.dial({
  to: destination,
  listen: eventHandlers
})
```

### Generic Event Handler

```typescript
function createEventHandler<T extends keyof CallSessionEventHandlers>(
  eventName: T
): CallSessionEventHandlers[T] {
  return (params) => {
    console.log(`Event ${eventName}:`, params)
    // Type-safe handling based on event name
  }
}

const call = await client.dial({
  to: destination,
  listen: {
    'call.joined': createEventHandler('call.joined'),
    'member.joined': createEventHandler('member.joined')
  }
})
```

## Performance Considerations

### Event Handler Optimization

1. **Avoid Heavy Computations**: Keep event handlers lightweight
2. **Debounce Frequent Events**: Use debouncing for events like `member.talking`
3. **Batch UI Updates**: Group multiple UI changes together
4. **Use Event Delegation**: For large member lists, use event delegation

```typescript
// ✅ Good - lightweight handlers
const call = await client.dial({
  listen: {
    'member.talking': debounce((params) => {
      updateTalkingIndicator(params.member.member_id, params.member.talking)
    }, 100),
    
    'member.updated': (params) => {
      // Queue UI update instead of immediate DOM manipulation
      queueUIUpdate(() => updateMemberUI(params.member))
    }
  }
})
```

---

## Conclusion

The simplified `dial()` API provides a cleaner, more reliable way to initiate calls with event handling. By combining call creation, event attachment, and call initiation into a single async method, it eliminates timing issues and provides a better developer experience.

For more examples and advanced usage patterns, see the example files:
- [`dial-with-events.ts`](./dial-with-events.ts) - TypeScript examples
- [`dial-with-events.js`](./dial-with-events.js) - JavaScript examples