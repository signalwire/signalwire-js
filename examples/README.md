# Call Fabric SDK - dial() API Examples and Documentation

This directory contains comprehensive examples and documentation for the new simplified `dial()` API with event listeners in the SignalWire Call Fabric SDK.

## 📁 Files Overview

### Examples
- **[`dial-with-events.ts`](./dial-with-events.ts)** - TypeScript examples with comprehensive event handling patterns
- **[`dial-with-events.js`](./dial-with-events.js)** - JavaScript examples including React, mobile, and browser integration

### Documentation
- **[`dial-api-documentation.md`](./dial-api-documentation.md)** - Complete API reference, best practices, and detailed usage guide
- **[`migration-guide.md`](./migration-guide.md)** - Step-by-step migration guide from the old dial pattern
- **[`README.md`](./README.md)** - This file

## 🚀 Quick Start

### Basic Usage

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
      console.log('Call joined!', params.room_session.name)
    },
    'member.joined': (params) => {
      console.log('Member joined:', params.member.name)
    },
    'call.left': (params) => {
      console.log('Call ended')
    }
  }
})

// Call is already started and ready to use!
```

### What's New

✅ **Single async method** - No more separate `start()` call  
✅ **No timing issues** - Events are attached before call starts  
✅ **Better error handling** - Single try/catch block  
✅ **Cleaner code** - More semantic and readable  
✅ **Type safety** - Full TypeScript support for event handlers

## 📋 Example Categories

### 1. Basic Examples
- Simple dial with essential events
- Audio/video configuration
- Basic error handling

### 2. Advanced Examples
- Comprehensive event handling
- Member management
- Layout and media controls
- Recording and playback

### 3. Error Handling
- Graceful degradation
- Fallback strategies
- Network error recovery

### 4. Specialized Use Cases
- Conference moderation
- Customer support calls
- Mobile optimization
- React integration

### 5. Migration Examples
- Old vs new pattern comparison
- Step-by-step migration
- Common pitfalls and solutions

## 🎯 Key Features Demonstrated

### Event Handling
- **Call lifecycle events**: `call.joined`, `call.state`, `call.left`
- **Member events**: `member.joined`, `member.left`, `member.updated`
- **Granular member events**: `member.updated.audioMuted`, `member.updated.videoMuted`
- **Media events**: `stream.started`, `stream.ended`, `layout.changed`
- **Recording events**: `recording.started`, `recording.ended`

### Configuration Options
- **Media constraints**: Audio/video quality settings
- **UI integration**: Root element and video overlays
- **User variables**: Custom metadata
- **Advanced routing**: Node selection and addressing

### Error Scenarios
- Authentication failures
- Permission denied
- Network issues
- Invalid destinations
- Media device errors

## 🏗️ Integration Patterns

### Framework Examples

**React**
```jsx
function CallComponent({ destination }) {
  const [call, setCall] = useState(null)
  
  const startCall = async () => {
    const newCall = await client.dial({
      to: destination,
      listen: {
        'call.joined': () => setCall(newCall),
        'call.left': () => setCall(null)
      }
    })
  }
  
  return (
    <div>
      {!call ? (
        <button onClick={startCall}>Start Call</button>
      ) : (
        <div>Call in progress...</div>
      )}
    </div>
  )
}
```

**Vue.js**
```vue
<template>
  <div>
    <button v-if="!call" @click="startCall">Start Call</button>
    <div v-else>Call Status: {{ callState }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      call: null,
      callState: 'idle'
    }
  },
  methods: {
    async startCall() {
      this.call = await client.dial({
        to: this.destination,
        listen: {
          'call.state': (params) => {
            this.callState = params.call_state
          }
        }
      })
    }
  }
}
</script>
```

**Angular**
```typescript
@Component({
  selector: 'app-call',
  template: `
    <button *ngIf="!call" (click)="startCall()">Start Call</button>
    <div *ngIf="call">Call Status: {{ callState }}</div>
  `
})
export class CallComponent {
  call: CallSession | null = null
  callState = 'idle'

  async startCall() {
    this.call = await client.dial({
      to: this.destination,
      listen: {
        'call.state': (params) => {
          this.callState = params.call_state
        }
      }
    })
  }
}
```

## 📱 Platform Support

### Browser Support
- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

### Mobile Support
- iOS Safari 14+
- Chrome Mobile 88+
- Android WebView 88+

### Node.js Support
- Node.js 16+ (for server-side applications)

## 🔧 Development Setup

### Prerequisites
```bash
npm install @signalwire/client
```

### Environment Variables
```env
SIGNALWIRE_HOST=your-space.signalwire.com
SIGNALWIRE_TOKEN=your-access-token
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## 🧪 Testing Examples

### Unit Testing
```typescript
describe('dial() API', () => {
  it('should handle call events', async () => {
    const handleJoined = jest.fn()
    
    await client.dial({
      to: '/test/room',
      listen: {
        'call.joined': handleJoined
      }
    })
    
    expect(handleJoined).toHaveBeenCalled()
  })
})
```

### Integration Testing
```typescript
describe('Call Integration', () => {
  it('should establish video call', async () => {
    const call = await client.dial({
      to: '/test/video-room',
      video: true,
      listen: {
        'call.joined': (params) => {
          expect(params.room_session.name).toBe('video-room')
        }
      }
    })
    
    expect(call.id).toBeDefined()
  })
})
```

## 📊 Performance Guidelines

### Event Handler Optimization
- Keep event handlers lightweight
- Use debouncing for frequent events
- Batch UI updates
- Avoid memory leaks in closures

### Best Practices
```typescript
// ✅ Good - lightweight handlers
const call = await client.dial({
  listen: {
    'member.talking': debounce((params) => {
      updateTalkingIndicator(params.member.member_id)
    }, 100)
  }
})

// ❌ Avoid - heavy computations in handlers
const call = await client.dial({
  listen: {
    'member.updated': (params) => {
      // Avoid heavy DOM manipulation or API calls
      performHeavyComputation(params)
    }
  }
})
```

## 🔍 Debugging Tips

### Enable Debug Logging
```typescript
const client = await SignalWire({
  host: 'your-space.signalwire.com',
  token: 'your-access-token',
  logLevel: 'debug',
  debug: { logWsTraffic: true }
})
```

### Common Issues
1. **Events not firing**: Check event names for typos
2. **Memory leaks**: Ensure event handlers don't capture large objects
3. **Permission errors**: Check microphone/camera permissions
4. **Network issues**: Verify firewall and WebRTC connectivity

## 📚 Additional Resources

### Official Documentation
- [SignalWire Developer Portal](https://developer.signalwire.com)
- [Call Fabric SDK Reference](https://docs.signalwire.com/sdks/javascript)
- [WebRTC Best Practices](https://developer.signalwire.com/guides/webrtc)

### Community
- [SignalWire Community](https://signalwire.community)
- [GitHub Repository](https://github.com/signalwire/signalwire-js)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/signalwire)

## 🤝 Contributing

### Reporting Issues
If you find issues with the examples or documentation:
1. Check existing issues on GitHub
2. Create a new issue with reproduction steps
3. Include environment details and error messages

### Suggesting Improvements
- Submit feature requests via GitHub issues
- Contribute example improvements via pull requests
- Share your use cases and patterns

## 📄 License

These examples are provided under the same license as the SignalWire JavaScript SDK.

---

## Quick Reference

### Essential Events
```typescript
const call = await client.dial({
  to: destination,
  listen: {
    'call.joined': (params) => { /* Call established */ },
    'call.state': (params) => { /* State changed */ },
    'call.left': (params) => { /* Call ended */ },
    'member.joined': (params) => { /* Member joined */ },
    'member.left': (params) => { /* Member left */ },
    'member.updated.audioMuted': (params) => { /* Audio toggled */ },
    'member.updated.videoMuted': (params) => { /* Video toggled */ }
  }
})
```

### Common Configuration
```typescript
const call = await client.dial({
  to: '/public/room-name',
  audio: true,
  video: { width: 1280, height: 720 },
  rootElement: document.getElementById('video-container'),
  userVariables: { role: 'participant' },
  listen: { /* event handlers */ }
})
```

### Error Handling Template
```typescript
try {
  const call = await client.dial({
    to: destination,
    listen: { /* handlers */ }
  })
} catch (error) {
  if (error.message.includes('Authentication')) {
    // Handle auth error
  } else if (error.message.includes('Permission')) {
    // Handle permission error
  } else {
    // Handle other errors
  }
}
```

Happy coding! 🎉