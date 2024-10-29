---
'@signalwire/webrtc': minor
---

Include public APIs for media renegotiation

```ts
// Enable video with "sendrecv" direction
await call.enableVideo()

// Enable video with "sendonly" direction
await call.enableVideo({ video: true, negotiateVideo: false })

// Enable video with "recvonly" direction
await call.enableVideo({ video: false, negotiateVideo: true })

// Disable video while keep on receiving it
await call.disableVideo({ negotiateVideo: true })

// Disable video completely
await call.disableVideo()
```
