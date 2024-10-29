---
'@signalwire/webrtc': minor
---

Include public APIs for media renegotiation

```ts
// Enable audio with "sendrecv" direction
await call.enableAudio()

// Enable audio with "sendonly" direction
await call.enableAudio({ audio: true, negotiateAudio: false })

// Enable audio with "recvonly" direction
await call.enableAudio({ audio: false, negotiateAudio: true })

// Disable audio while keeps on receiving it
await call.disableAudio({ negotiateAudio: true })

// Disable audio completely
await call.disableAudio()

// Enable video with "sendrecv" direction
await call.enableVideo()

// Enable video with "sendonly" direction
await call.enableVideo({ video: true, negotiateVideo: false })

// Enable video with "recvonly" direction
await call.enableVideo({ video: false, negotiateVideo: true })

// Disable video while keeps on receiving it
await call.disableVideo({ negotiateVideo: true })

// Disable video completely
await call.disableVideo()
```
