# SignalWire Call Fabric SDK Developer Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Installation & Setup](#installation--setup)
3. [Client Initialization](#client-initialization)
4. [Core Concepts](#core-concepts)
5. [API Reference](#api-reference)
6. [Event System](#event-system)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

## Introduction

The SignalWire Call Fabric SDK provides a unified communication platform that seamlessly integrates audio/video calling with messaging capabilities. This SDK enables developers to build sophisticated real-time communication applications with features like video conferencing, screen sharing, messaging, and advanced call controls.

### Key Features
- WebRTC-based audio/video calling
- Real-time messaging and chat
- Screen sharing with audio
- Advanced call controls (mute, hold, volume)
- Room management and layouts
- State persistence across reloads
- Device management

## Installation & Setup

```bash
npm install @signalwire/js
```

### Basic HTML Setup
```html
<!DOCTYPE html>
<html>
<head>
  <title>Call Fabric Example</title>
</head>
<body>
  <div id="rootElement"></div>
  <script type="module">
    import { SignalWire } from '@signalwire/js'
    
    // Your code here
  </script>
</body>
</html>
```

## Client Initialization

### Standard Client (with Authentication Token)

```javascript
import { SignalWire } from '@signalwire/js'

const client = await SignalWire({
  host: 'your-space.signalwire.com',
  token: 'your-sat-token',
  debug: { 
    logWsTraffic: true  // Optional: Enable WebSocket traffic logging
  }
})
```

## Core Concepts

### Addresses
Addresses are the fundamental routing mechanism in Call Fabric. They represent endpoints that can be dialed, such as:
- Room addresses (e.g., `/public/my-room`)
- User addresses
- SIP endpoints
- PSTN numbers

### Channels
Channels define the media type for a call:
- `video` - Full audio/video call
- `audio` - Audio-only call

### Members
Participants in a call, including:
- Regular members (users)
- Screen share members
- Device members (future support)

## API Reference

### Client Methods

#### `client.dial(options)`
Initiates a new call.

**Parameters:**
```typescript
interface DialOptions {
  to: string                      // Address to dial (e.g., "/public/room-name?channel=video")
  rootElement: HTMLElement        // DOM element for video rendering
  stopCameraWhileMuted?: boolean  // Stop camera when video muted (default: false)
  stopMicrophoneWhileMuted?: boolean // Stop mic when audio muted (default: false)
}
```

**Returns:** `Promise<CallSession>`

**Example:**
```javascript
const call = await client.dial({
  to: '/public/my-room?channel=video',
  rootElement: document.getElementById('rootElement'),
  stopCameraWhileMuted: true
})
await call.start()
```

#### `client.reattach(options)`
Reattaches to an existing call session after page reload.

**Parameters:** Same as `dial()`

**Returns:** `Promise<CallSession>`

**Example:**
```javascript
// After page reload
const call = await client.reattach({
  to: '/public/my-room?channel=video',
  rootElement: document.getElementById('rootElement')
})
await call.start()
```

### Address Management

#### `client.address.getAddresses(params)`
Retrieves multiple addresses with filtering and pagination.

**Parameters:**
```typescript
interface GetAddressesParams {
  type?: 'room' | 'user' | 'sip' | 'pstn'
  sortBy?: 'name' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  pageSize?: number
  page?: number
}
```

**Returns:**
```typescript
interface AddressesResponse {
  addresses: Address[]
  meta: {
    total: number
    page: number
    pageSize: number
  }
}
```

#### `client.address.getAddress(params)`
Retrieves a single address by ID or name.

**Parameters:**
```typescript
interface GetAddressParams {
  id?: string    // Address ID
  name?: string  // Address name (mutually exclusive with id)
}
```

#### `client.address.getMyAddresses()`
Retrieves addresses owned by the current user.

### Call Session Methods

#### Audio Controls

##### `call.audioMute(params?)`
Mutes audio for self or other members.

**Parameters:**
```typescript
interface MuteParams {
  memberId?: string | 'all'  // Target member ID or 'all'
}
```

##### `call.audioUnmute(params?)`
Unmutes audio for self or other members.

##### `call.setInputVolume(params)`
Sets microphone input volume.

**Parameters:**
```typescript
interface VolumeParams {
  volume: number        // 0-100
  memberId?: string     // Target member ID
}
```

##### `call.setOutputVolume(params)`
Sets speaker output volume.

##### `call.setInputSensitivity(params)`
Sets microphone sensitivity (noise gate).

**Parameters:**
```typescript
interface SensitivityParams {
  value: number         // 0-100
  memberId?: string     // Target member ID
}
```

##### `call.setAudioFlags(params)`
Configures audio processing options.

**Parameters:**
```typescript
interface AudioFlagsParams {
  autoGain?: boolean
  echoCancellation?: boolean
  noiseSuppression?: boolean
  memberId?: string
}
```

#### Video Controls

##### `call.videoMute(params?)`
Mutes video for self or other members.

##### `call.videoUnmute(params?)`
Unmutes video for self or other members.

##### `call.startScreenShare(params?)`
Starts screen sharing.

**Parameters:**
```typescript
interface ScreenShareParams {
  audio?: boolean  // Include system audio
  video?: boolean  // Include video
}
```

**Returns:** `Promise<ScreenShareSession>`

#### Room Management

##### `call.lock()`
Locks the room to prevent new members from joining.

##### `call.unlock()`
Unlocks the room.

##### `call.setLayout(params)`
Changes the video layout.

**Parameters:**
```typescript
interface LayoutParams {
  name: string  // Layout name (e.g., '3x3', 'grid-responsive', 'highlight-1-responsive')
}
```

#### Call Control

##### `call.hold()`
Places the call on hold (stops receiving media).

##### `call.unhold()`
Resumes the call from hold.

##### `call.hangup()`
Ends the call and disconnects.

#### Member Interaction

##### `call.setRaisedHand(params?)`
Raises or lowers hand for self or other members.

**Parameters:**
```typescript
interface RaiseHandParams {
  raised?: boolean      // true to raise, false to lower
  memberId?: string     // Target member ID
}
```

### Conversation/Messaging

#### `client.conversation.subscribe(callback)`
Subscribes to conversation events.

**Parameters:**
```typescript
type ConversationCallback = (event: ConversationEvent) => void

interface ConversationEvent {
  subtype: 'chat' | 'system'
  text: string
  from_address_id: string
  timestamp: number
}
```

#### `client.conversation.join(params)`
Joins a conversation group.

**Parameters:**
```typescript
interface JoinConversationParams {
  addressIds: string[]
  from_address_id: string
}
```

**Returns:**
```typescript
interface JoinResponse {
  group_id: string
  members: ConversationMember[]
}
```

#### `client.conversation.sendMessage(params)`
Sends a message to a conversation.

**Parameters:**
```typescript
interface SendMessageParams {
  group_id: string
  text: string
  from_address_id: string
}
```

#### `client.conversation.getConversationMessages(params)`
Retrieves conversation history.

**Parameters:**
```typescript
interface GetMessagesParams {
  group_id: string
  limit?: number
  before?: string  // Message ID for pagination
}
```

## Event System

The SDK uses a hierarchical event system that provides both generic and specific event handlers.

### Call Events

#### `call.joined`
Fired when successfully joined a call.

```javascript
call.on('call.joined', (params) => {
  console.log('Call ID:', params.call_id)
  console.log('Room Session:', params.room_session)
  console.log('Members:', params.room_session.members)
})
```

#### `call.left`
Fired when leaving a call.

```javascript
call.on('call.left', (params) => {
  console.log('Left call:', params.call_id)
})
```

### Room Events

#### `room.joined`
Fired when successfully joined a room.

```javascript
call.on('room.joined', (params) => {
  console.log('Room ID:', params.room_id)
  console.log('Room Session ID:', params.room_session_id)
})
```

#### `room.updated`
Fired when room properties change.

```javascript
call.on('room.updated', (params) => {
  if (params.room_session.locked !== undefined) {
    console.log('Room locked state:', params.room_session.locked)
  }
})
```

### Member Events

#### `member.joined`
Fired when a new member joins.

```javascript
call.on('member.joined', (params) => {
  const member = params.member
  console.log(`${member.name} joined (${member.type})`)
  
  if (member.type === 'screen') {
    console.log('Screen share started')
  }
})
```

#### `member.left`
Fired when a member leaves.

```javascript
call.on('member.left', (params) => {
  console.log(`Member ${params.member.member_id} left`)
})
```

#### `member.updated`
Generic member update event.

```javascript
call.on('member.updated', (params) => {
  const updates = params.member.updated // Array of changed fields
  console.log(`Member ${params.member.member_id} updated:`, updates)
})
```

#### Specific Member Update Events

The SDK provides specific events for common member updates:

```javascript
// Audio mute state changed
call.on('member.updated.audioMuted', (params) => {
  const { member_id, audio_muted } = params.member
  console.log(`Member ${member_id} audio muted: ${audio_muted}`)
})

// Video mute state changed
call.on('member.updated.videoMuted', (params) => {
  const { member_id, video_muted } = params.member
  console.log(`Member ${member_id} video muted: ${video_muted}`)
})

// Hand raised state changed
call.on('member.updated.handraised', (params) => {
  const { member_id, handraised } = params.member
  console.log(`Member ${member_id} hand raised: ${handraised}`)
})

// Visibility changed
call.on('member.updated.visible', (params) => {
  const { member_id, visible } = params.member
  console.log(`Member ${member_id} visible: ${visible}`)
})
```

### Layout Events

#### `layout.changed`
Fired when the room layout changes.

```javascript
call.on('layout.changed', (params) => {
  console.log('New layout:', params.layout.name)
  console.log('Positions:', params.layout.positions)
})
```

## Code Examples

### Complete Video Call Example

```javascript
import { SignalWire } from '@signalwire/js'

async function startVideoCall() {
  // Initialize client
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-sat-token'
  })
  
  // Set up call
  const call = await client.dial({
    to: '/public/my-meeting-room?channel=video',
    rootElement: document.getElementById('videoContainer'),
    stopCameraWhileMuted: true
  })
  
  // Set up event handlers
  call.on('call.joined', (params) => {
    console.log('Joined call with', params.room_session.members.length, 'members')
    updateMemberList(params.room_session.members)
  })
  
  call.on('member.joined', (params) => {
    console.log(`${params.member.name} joined`)
    addMemberToList(params.member)
  })
  
  call.on('member.left', (params) => {
    console.log(`${params.member.name} left`)
    removeMemberFromList(params.member.member_id)
  })
  
  call.on('member.updated.audioMuted', (params) => {
    updateMemberAudioState(params.member.member_id, params.member.audio_muted)
  })
  
  // Start the call
  await call.start()
  
  // Set up UI controls
  document.getElementById('muteButton').onclick = async () => {
    await call.audioMute()
  }
  
  document.getElementById('videoButton').onclick = async () => {
    await call.videoMute()
  }
  
  document.getElementById('shareButton').onclick = async () => {
    const screenShare = await call.startScreenShare({ audio: true })
    
    screenShare.on('room.left', () => {
      console.log('Screen share ended')
    })
  }
  
  return call
}

// Start the call when page loads
window.addEventListener('load', startVideoCall)
```

### Audio-Only Call with Controls

```javascript
async function startAudioCall() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-sat-token'
  })
  
  const call = await client.dial({
    to: '/public/audio-conference?channel=audio',
    rootElement: document.getElementById('audioContainer')
  })
  
  // Configure audio processing
  await call.setAudioFlags({
    autoGain: true,
    echoCancellation: true,
    noiseSuppression: true
  })
  
  // Set initial volume
  await call.setInputVolume({ volume: 80 })
  await call.setOutputVolume({ volume: 90 })
  
  await call.start()
  
  return call
}
```

### Call with Reattachment Support

```javascript
// Store call info in session storage
function storeCallInfo(to) {
  sessionStorage.setItem('activeCall', JSON.stringify({ to }))
}

function getStoredCallInfo() {
  const stored = sessionStorage.getItem('activeCall')
  return stored ? JSON.parse(stored) : null
}

async function initializeCall() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-sat-token'
  })
  
  const callInfo = getStoredCallInfo()
  let call
  
  if (callInfo) {
    // Try to reattach to existing call
    try {
      call = await client.reattach({
        to: callInfo.to,
        rootElement: document.getElementById('videoContainer')
      })
      console.log('Reattached to existing call')
    } catch (e) {
      console.log('No active call to reattach to')
      sessionStorage.removeItem('activeCall')
    }
  }
  
  if (!call) {
    // Start new call
    const to = '/public/persistent-room?channel=video'
    call = await client.dial({
      to,
      rootElement: document.getElementById('videoContainer')
    })
    storeCallInfo(to)
  }
  
  call.on('call.left', () => {
    sessionStorage.removeItem('activeCall')
  })
  
  await call.start()
  return call
}
```

### Messaging Integration

```javascript
async function setupMessaging() {
  const client = await SignalWire({
    host: 'your-space.signalwire.com',
    token: 'your-sat-token'
  })
  
  // Get user's addresses
  const myAddresses = await client.address.getMyAddresses()
  const myAddress = myAddresses.addresses[0]
  
  // Subscribe to messages
  client.conversation.subscribe((event) => {
    if (event.subtype === 'chat') {
      displayMessage({
        text: event.text,
        from: event.from_address_id,
        timestamp: new Date(event.timestamp)
      })
    }
  })
  
  // Join conversation with other users
  const otherAddresses = ['address_id_1', 'address_id_2']
  const conversation = await client.conversation.join({
    addressIds: otherAddresses,
    from_address_id: myAddress.id
  })
  
  // Send message function
  window.sendMessage = async (text) => {
    await client.conversation.sendMessage({
      group_id: conversation.group_id,
      text: text,
      from_address_id: myAddress.id
    })
  }
  
  // Load conversation history
  const history = await client.conversation.getConversationMessages({
    group_id: conversation.group_id,
    limit: 50
  })
  
  history.messages.forEach(msg => displayMessage(msg))
}
```

## Best Practices

### 1. Error Handling

Always wrap async operations in try-catch blocks:

```javascript
try {
  const call = await client.dial({ ... })
  await call.start()
} catch (error) {
  console.error('Failed to start call:', error)
  // Show user-friendly error message
}
```

### 2. Event Cleanup

Remove event listeners when done:

```javascript
const handler = (params) => console.log(params)
call.on('member.joined', handler)

// Later...
call.off('member.joined', handler)
```

### 3. State Management

Track important state locally:

```javascript
const callState = {
  members: new Map(),
  audioMuted: false,
  videoMuted: false,
  isLocked: false
}

call.on('call.joined', (params) => {
  params.room_session.members.forEach(member => {
    callState.members.set(member.member_id, member)
  })
})

call.on('member.updated', (params) => {
  const member = callState.members.get(params.member.member_id)
  if (member) {
    Object.assign(member, params.member)
  }
})
```

### 4. Device Permissions

Request permissions before starting calls:

```javascript
async function checkPermissions() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: true 
    })
    // Clean up test stream
    stream.getTracks().forEach(track => track.stop())
    return true
  } catch (error) {
    console.error('Permission denied:', error)
    return false
  }
}

// Check before dialing
if (await checkPermissions()) {
  const call = await client.dial({ ... })
}
```

### 5. Network Resilience

Handle connection issues gracefully:

```javascript
call.on('connection.disconnected', () => {
  showReconnectingUI()
})

call.on('connection.connected', () => {
  hideReconnectingUI()
})

// Consider implementing exponential backoff for reconnection
```

### 6. Resource Cleanup

Always clean up resources:

```javascript
window.addEventListener('beforeunload', async () => {
  if (call) {
    await call.hangup()
  }
})
```

## Troubleshooting

### Common Issues

1. **No audio/video**
   - Check browser permissions
   - Verify device is not in use by another application
   - Check mute states

2. **Cannot join room**
   - Verify address exists and is accessible
   - Check authentication token
   - Ensure room is not locked

3. **Poor quality**
   - Check network bandwidth
   - Reduce video resolution
   - Enable audio processing flags

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
const client = await SignalWire({
  host: 'your-space.signalwire.com',
  token: 'your-token',
  debug: {
    logWsTraffic: true
  }
})
```

## Conclusion

The SignalWire Call Fabric SDK provides a comprehensive platform for building real-time communication applications. With its flexible API, robust event system, and advanced features, developers can create sophisticated video conferencing, audio calling, and messaging solutions tailored to their specific needs.
