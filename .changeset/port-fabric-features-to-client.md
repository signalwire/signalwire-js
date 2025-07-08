---
'@signalwire/client': patch
---

Port Call Fabric SDK features from @signalwire/js to @signalwire/client

- Support muting/unmuting audio and video for all participants by passing `memberId: "all"`
- Export `SetAudioFlagsParams` type for microphone features support

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