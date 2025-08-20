====
TITLE: Call Reattachment
DESCRIPTION: Reconnect to existing calls after page reload or connection loss
SOURCE: reattach.spec.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Initial call setup
const client = await SignalWire({ token: 'your-auth-token' })
const call = await client.dial({
  to: '/public/room-name?channel=video',
  rootElement: document.getElementById('rootElement')
})

await call.start()

// Save call information for reattachment
const callId = call.call_id
localStorage.setItem('activeCallId', callId)
localStorage.setItem('callAddress', '/public/room-name?channel=video')

// ... page reload or connection loss ...

// Reattach to existing call
const savedCallId = localStorage.getItem('activeCallId')
const savedAddress = localStorage.getItem('callAddress')

if (savedCallId && savedAddress) {
  const newClient = await SignalWire({ token: 'your-auth-token' })
  
  try {
    const reattachedCall = await newClient.reattach({
      to: savedAddress,
      rootElement: document.getElementById('rootElement')
    })
    
    // Listen for reattachment completion
    reattachedCall.on('call.joined', (event) => {
      console.log('Reattached to call:', event.call_id)
      console.log('Room state:', event.room_session)
      
      // All states are preserved:
      // - Audio/video mute states
      // - Room lock state
      // - Volume settings
      // - Member positions
      
      const selfMember = event.room_session.members.find(
        m => m.member_id === event.member_id
      )
      
      console.log('My state:', {
        audioMuted: selfMember.audio_muted,
        videoMuted: selfMember.video_muted,
        inputVolume: selfMember.input_volume,
        outputVolume: selfMember.output_volume
      })
    })
    
    // Start the reattached call
    await reattachedCall.start()
    
    // Continue using the call normally
    await reattachedCall.audioUnmute()
    
  } catch (error) {
    console.error('Failed to reattach:', error)
    // Handle reattachment failure (e.g., call ended)
    localStorage.removeItem('activeCallId')
    localStorage.removeItem('callAddress')
  }
}

// Media direction control for bandwidth optimization
const call = await client.dial({
  to: '/public/room-name?channel=video',
  rootElement: document.getElementById('rootElement'),
  audio: { direction: 'inactive' },  // Start without audio
  video: { direction: 'inactive' }   // Start without video
})

await call.start()

// Enable audio/video when ready
await call.setAudioDirection('sendrecv')  // Enable bidirectional audio
await call.setVideoDirection('sendonly')   // Send video only
await call.setVideoDirection('recvonly')   // Receive video only
await call.setVideoDirection('sendrecv')   // Full video

// Or use updateMedia for multiple changes
await call.updateMedia({
  audio: { direction: 'sendrecv' },
  video: { direction: 'sendrecv' }
})
```
===