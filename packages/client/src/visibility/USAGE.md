# Visibility Lifecycle Management - Usage Guide

## Overview
The visibility lifecycle management feature helps maintain WebRTC connections when browser tabs are hidden/restored, improving the user experience for SignalWire SDK applications.

## Basic Usage

### Video Room Session

```typescript
import { SignalWire } from '@signalwire/js'

const roomSession = await SignalWire.Video.createRoomSession({
  token: 'your-token',
  rootElement: document.getElementById('video-container'),
  
  // Enable visibility management
  visibilityConfig: {
    enabled: true,
    debounceDelay: 500,
    recovery: {
      strategies: [
        'VideoPlay',
        'KeyframeRequest',
        'LayoutRefresh'
      ],
      maxAttempts: 3,
      delayBetweenAttempts: 1000
    }
  }
})

// Listen for visibility events
roomSession.on('visibility.lost', (event) => {
  console.log('Tab hidden, media state saved:', event.mediaState)
})

roomSession.on('visibility.restored', (event) => {
  console.log('Tab visible again, recovery completed:', event.recoveryResult)
})
```

### Call Fabric Session

```typescript
import { SignalWire } from '@signalwire/js'

const call = await SignalWire.Call.dial({
  to: '/public/some_room',
  
  // Enable visibility management with Call Fabric specific settings
  visibilityConfig: {
    enabled: true,
    recovery: {
      strategies: [
        'VideoPlay',
        'KeyframeRequest',
        'StreamReconnection',
        'Reinvite'
      ],
      maxAttempts: 5,
      delayBetweenAttempts: 1500
    }
  }
})

// The Call Fabric session will automatically handle reconnection
// when the tab becomes visible again
```

## Mobile Optimization

Enable mobile-specific optimizations:

```typescript
const roomSession = await SignalWire.Video.createRoomSession({
  token: 'your-token',
  
  visibilityConfig: {
    enabled: true,
    mobileOptimization: true,  // Enable mobile-specific handling
    recovery: {
      strategies: ['VideoPlay', 'KeyframeRequest'],
      maxAttempts: 5,
      delayBetweenAttempts: 2000  // Longer delay for mobile
    }
  }
})
```

## Configuration Options

### VisibilityConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the feature |
| `debounceDelay` | `number` | `500` | Milliseconds to wait before triggering recovery |
| `recovery.strategies` | `string[]` | `['VideoPlay', 'KeyframeRequest']` | Recovery strategies to use |
| `recovery.maxAttempts` | `number` | `3` | Maximum recovery attempts |
| `recovery.delayBetweenAttempts` | `number` | `1000` | Delay between attempts (ms) |
| `mobileOptimization` | `boolean` | `false` | Enable mobile-specific optimizations |
| `deviceManagement` | `boolean` | `false` | Track device changes |

### Recovery Strategies

- **VideoPlay**: Attempts to resume video playback (least invasive)
- **KeyframeRequest**: Requests a new keyframe from the server
- **StreamReconnection**: Reconnects the media stream
- **Reinvite**: Full renegotiation (most invasive)
- **LayoutRefresh**: Refreshes video layout (Video SDK only)
- **CallFabricResume**: Resumes Call Fabric connection (Call Fabric only)

## Events

The feature emits events on the session instance:

```typescript
// Tab visibility changes
roomSession.on('visibility.visibility', (event) => {
  console.log('Visibility changed:', event.isVisible)
})

// Focus changes
roomSession.on('visibility.focus', (event) => {
  console.log('Focus changed:', event.hasFocus)
})

// Device wake detection (mobile)
roomSession.on('visibility.wake', (event) => {
  console.log('Device woke from sleep')
})

// Recovery events
roomSession.on('visibility.lost', (event) => {
  // Tab is now hidden
})

roomSession.on('visibility.restored', (event) => {
  // Tab is visible again, recovery completed
})
```

## Backward Compatibility

The feature is opt-in and fully backward compatible:

```typescript
// Without visibility management (existing code continues to work)
const roomSession = await SignalWire.Video.createRoomSession({
  token: 'your-token',
  rootElement: document.getElementById('video-container')
})

// With visibility management (opt-in)
const roomSession = await SignalWire.Video.createRoomSession({
  token: 'your-token',
  rootElement: document.getElementById('video-container'),
  visibilityConfig: { enabled: true }
})
```

## Best Practices

1. **Choose appropriate strategies**: Start with less invasive strategies
2. **Adjust delays for your use case**: Longer delays for mobile devices
3. **Monitor recovery events**: Log failures for debugging
4. **Test on target devices**: Especially important for mobile browsers
5. **Consider network conditions**: Increase attempts/delays for poor connections

## Debugging

Enable debug logging to troubleshoot issues:

```typescript
import { setLogger } from '@signalwire/core'

setLogger({
  trace: console.log,
  debug: console.log,
  info: console.log,
  warn: console.warn,
  error: console.error
})
```

Monitor visibility events in the browser console:
```javascript
document.addEventListener('visibilitychange', () => {
  console.log('Document visibility:', document.visibilityState)
})
```
