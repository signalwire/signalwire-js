====
TITLE: Incoming Calls and Push Notifications
DESCRIPTION: Handle incoming calls via WebSocket or push notifications
SOURCE: incomingCallManager.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Initialize client with incoming call handler
const client = await SignalWire({
  token: 'your-auth-token',
  
  incomingCallHandlers: {
    onIncomingCall: async (notification) => {
      // Access call details
      const { callID, caller_id_name, caller_id_number, node_id } = 
        notification.invite.details
      
      console.log('Incoming call from:', caller_id_name, caller_id_number)
      
      // Show UI for accept/reject
      const userAccepted = await showIncomingCallUI({
        callerName: caller_id_name,
        callerNumber: caller_id_number
      })
      
      if (userAccepted) {
        // Accept the call
        const call = await notification.invite.accept({
          rootElement: document.getElementById('rootElement'),
          audio: true,
          video: true
        })
        
        // Set up call event handlers
        call.on('call.state', (state) => {
          console.log('Call state:', state.call_state)
        })
        
        // Start the accepted call
        await call.start()
        
      } else {
        // Reject the call
        await notification.invite.reject()
        console.log('Call rejected')
      }
    }
  }
})

// Handle incoming calls from push notifications
// (when app is in background or WebSocket is disconnected)
async function handlePushNotification(pushData: any) {
  const client = await SignalWire({ token: 'your-auth-token' })
  
  const result = await client.handlePushNotification({
    // Push notification payload
    id: pushData.id,
    callID: pushData.callID,
    // ... other push data
  })
  
  if (result.type === 'incomingCall') {
    // Handle the incoming call
    const call = await result.call.accept({
      rootElement: document.getElementById('rootElement')
    })
    await call.start()
  }
}

// Multiple call handlers for different scenarios
const client = await SignalWire({
  token: 'your-auth-token',
  
  incomingCallHandlers: {
    onIncomingCall: async (notification) => {
      // Default handler for all calls
      console.log('Incoming call via WebSocket')
      await handleIncomingCall(notification)
    },
    
    // Additional handlers can be added based on call properties
    // These would be filtered/routed on your application side
  }
})

// Helper function to handle incoming calls
async function handleIncomingCall(notification: IncomingCallNotification) {
  const invite = notification.invite
  
  // Auto-answer based on caller
  const trustedCallers = ['support', 'admin']
  const shouldAutoAnswer = trustedCallers.some(name => 
    invite.details.caller_id_name.includes(name)
  )
  
  if (shouldAutoAnswer) {
    const call = await invite.accept({
      rootElement: document.getElementById('rootElement'),
      audio: true,
      video: false  // Audio only for auto-answered calls
    })
    await call.start()
  } else {
    // Show manual accept/reject UI
    showIncomingCallDialog(invite)
  }
}
```
===