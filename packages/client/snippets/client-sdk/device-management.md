====
TITLE: Device Management
DESCRIPTION: Manage audio/video devices and handle device events in WebRTC calls
SOURCE: deviceEvent.spec.ts, deviceState.spec.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Initialize client and dial
const client = await SignalWire({ token: 'your-auth-token' })
const call = await client.dial({
  to: '/public/room-name?channel=video',
  rootElement: document.getElementById('rootElement'),
  // Device state options
  stopCameraWhileMuted: true,    // Stop camera feed when video is muted
  stopMicrophoneWhileMuted: true  // Stop microphone when audio is muted
})

// Start the call
await call.start()

// Device update events
call.on('microphone.updated', (event) => {
  console.log('Microphone changed:', {
    previous: event.previous,
    current: event.current
  })
})

call.on('camera.updated', (event) => {
  console.log('Camera changed:', {
    previous: event.previous,
    current: event.current
  })
})

call.on('speaker.updated', (event) => {
  console.log('Speaker changed:', {
    previous: event.previous,
    current: event.current
  })
})

// Device disconnection events
call.on('microphone.disconnected', (event) => {
  console.log('Microphone disconnected:', event)
  // Handle microphone removal
})

call.on('camera.disconnected', (event) => {
  console.log('Camera disconnected:', event)
  // Handle camera removal
})

// Update devices during call
await call.updateMicrophone({ deviceId: 'new-mic-id' })
await call.updateCamera({ deviceId: 'new-camera-id' })
await call.updateSpeaker({ deviceId: 'new-speaker-id' })

// Get available devices
const devices = await navigator.mediaDevices.enumerateDevices()
const audioInputs = devices.filter(d => d.kind === 'audioinput')
const videoInputs = devices.filter(d => d.kind === 'videoinput')
const audioOutputs = devices.filter(d => d.kind === 'audiooutput')

// Register device for push notifications
await client.registerDevice({
  deviceType: 'iOS',  // 'iOS' | 'Android' | 'Desktop'
  deviceToken: 'push-notification-token'
})

// Unregister device
await client.unregisterDevice({
  id: 'device-id'
})
```
===