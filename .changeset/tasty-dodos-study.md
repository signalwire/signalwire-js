---
'@signalwire/js': minor
---

CF SDK: Support default media params

```ts
await call.dial({
  applyLocalVideoOverlay: false, // Should the SDK apply local video overlay? Default: true
  applyMemberOverlay: true, // Should the SDK apply member video overlays? Default: true
  stopCameraWhileMuted: true, // Should the SDK stop the camera when muted? Default: true
  stopMicrophoneWhileMuted: true, // Should the SDK stop the mic when muted? Default: true
  mirrorLocalVideoOverlay: false // Should the SDK mirror the local video overlay? Default: true
})
```
