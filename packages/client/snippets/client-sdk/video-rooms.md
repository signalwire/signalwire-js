====
TITLE: Video Rooms
DESCRIPTION: Complete video room functionality including screen sharing, layouts, and room controls
SOURCE: videoRoom.spec.ts, videoRoomLayout.spec.ts
LANGUAGE: typescript
CODE:
```typescript
import { SignalWire } from '@signalwire/client'

// Initialize and join a video room
const client = await SignalWire({ token: 'your-auth-token' })
const call = await client.dial({
  to: '/public/room-name?channel=video',  // or ?channel=audio for audio-only
  rootElement: document.getElementById('rootElement')
})

// Listen for room events before starting
call.on('room.joined', (room) => {
  console.log('Joined room:', room.room_session.name)
  console.log('Members:', room.room_session.members.length)
})

call.on('member.joined', (event) => {
  console.log('Member joined:', event.member.name)
})

call.on('member.left', (event) => {
  console.log('Member left:', event.member.name)
})

// Start the call
await call.start()

// Access room session properties
console.log('Room ID:', call.roomSessionId)
console.log('My member ID:', call.memberId)

// Room controls
await call.lock()    // Lock the room (no new members can join)
await call.unlock()  // Unlock the room

// Screen sharing
const screenShare = await call.startScreenShare({
  audio: true,   // Include system audio
  video: true    // Share screen video
})

// Listen for screen share events
call.on('member.joined', (event) => {
  if (event.member.type === 'screen') {
    console.log('Screen share started:', event.member.member_id)
  }
})

// Stop screen sharing
await screenShare.leave()

// Layout management
await call.setLayout({ name: '3x3' })     // Set grid layout
await call.setLayout({ name: '8x8' })     // Larger grid
await call.setLayout({ name: 'grid-9' })  // 9-person grid

// Listen for layout changes
call.on('layout.changed', (event) => {
  console.log('Layout changed to:', event.layout.name)
  console.log('Available positions:', event.layout.layers.length)
})

// Get current layout info
const currentLayout = call.currentLayout
const myPosition = call.currentPosition

// Set member positions in layout
await call.setPositions({
  positions: {
    self: 'reserved-1',  // Set your own position
    'member-id-123': 'reserved-2'  // Set another member's position
  }
})

// Member management (requires permissions)
await call.audioMute({ memberId: 'member-id' })
await call.videoMute({ memberId: 'member-id' })
await call.removeMember({ memberId: 'member-id' })

// Get member list
const members = call.getMembers()
members.forEach(member => {
  console.log('Member:', {
    id: member.member_id,
    name: member.name,
    audioMuted: member.audio_muted,
    videoMuted: member.video_muted,
    visible: member.visible,
    handraised: member.handraised
  })
})

// Leave the room
await call.leave()
```
===