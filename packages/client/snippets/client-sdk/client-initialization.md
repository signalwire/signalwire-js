====
TITLE: Client Initialization
DESCRIPTION: Initialize and configure the SignalWire Fabric SDK client
SOURCE: createWSClient.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Basic initialization with token
const client = await SignalWire({
  token: 'your-auth-token',  // JWT or SAT token
})

// Advanced initialization with options
const client = await SignalWire({
  token: 'your-auth-token',
  
  // Optional: Specify host for on-premise deployments
  host: 'your-signalwire-host.com',
  
  // Optional: Incoming call handlers
  incomingCallHandlers: {
    onIncomingCall: (notification) => {
      console.log('Incoming call:', notification.invite.details)
      
      // Accept the call
      const call = await notification.invite.accept({
        rootElement: document.getElementById('rootElement')
      })
      await call.start()
      
      // Or reject the call
      // await notification.invite.reject()
    }
  },
  
  // Optional: Connection event handlers
  onDisconnected: () => {
    console.log('Client disconnected')
  }
})

// Get subscriber information
const subscriberInfo = await client.getSubscriberInfo()
console.log('Subscriber:', {
  id: subscriberInfo.id,
  email: subscriberInfo.email,
  displayName: subscriberInfo.display_name,
  fabricAddresses: subscriberInfo.fabric_addresses
})

// Update authentication token (for refresh)
await client.updateToken('new-auth-token')

// Disconnect when done
await client.disconnect()

// Client state management
await client.online()   // Mark client as online
await client.offline()  // Mark client as offline

// Check connection status
client.on('session.disconnected', () => {
  console.log('Session disconnected')
  // Handle reconnection logic
})

client.on('session.connected', () => {
  console.log('Session connected')
})
```
===