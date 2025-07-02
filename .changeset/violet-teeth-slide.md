---
'@signalwire/js': minor
---

[CF SDK]: Support muting/unmuting audio and video for all participants

```ts
// Mute audio for all participants in the room
await audioMute({ memberId: "all" })

// Unmute audio for all participants in the room
await audioUnmute({ memberId: "all" })

// Mute video for all participants in the room
await videoMute({ memberId: "all" })

// Unmute video for all participants in the room
await videoUnmute({ memberId: "all" })
```
