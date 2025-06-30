====
TITLE: Call Controls
DESCRIPTION: Core call control features including mute, hold, and hand raising
SOURCE: holdunhold.spec.ts, raiseHand.spec.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Initialize and dial
const client = await SignalWire({ token: 'your-auth-token' })
const call = await client.dial({
  to: '/public/room-name?channel=video',
  rootElement: document.getElementById('rootElement')
})

await call.start()

// Audio controls
await call.audioMute()    // Mute microphone
await call.audioUnmute()  // Unmute microphone
await call.deaf()         // Stop receiving audio
await call.undeaf()       // Resume receiving audio

// Video controls
await call.videoMute()    // Turn off camera
await call.videoUnmute()  // Turn on camera

// Hold/Unhold functionality
await call.hold()    // Put call on hold (stops receiving audio/video)
await call.unhold()  // Resume call

// Volume controls
await call.setInputVolume({ volume: 80 })   // Set microphone volume (0-100)
await call.setOutputVolume({ volume: 90 })  // Set speaker volume (0-100)

// Set volume for specific member
await call.setInputVolume({ 
  volume: 70, 
  memberId: 'other-member-id' 
})

// Raise hand feature
await call.setRaisedHand()                    // Raise your hand
await call.setRaisedHand({ raised: false })   // Lower your hand

// Raise/lower hand for other members (requires permissions)
await call.setRaisedHand({ 
  raised: true, 
  memberId: 'other-member-id' 
})

// Listen to member events
call.on('member.updated', (event) => {
  if (event.member.handraised) {
    console.log(`${event.member.name} raised their hand`)
  }
})

call.on('member.updated.audioMuted', (event) => {
  console.log(`${event.member.name} is ${event.member.audio_muted ? 'muted' : 'unmuted'}`)
})

call.on('member.updated.videoMuted', (event) => {
  console.log(`${event.member.name} video is ${event.member.video_muted ? 'off' : 'on'}`)
})

// End the call
await call.hangup()
```
===