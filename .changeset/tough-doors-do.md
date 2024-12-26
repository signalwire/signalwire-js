---
'@signalwire/webrtc': minor
'@signalwire/core': minor
'@signalwire/js': minor
---

Fabric and Video SDK: Introduce an update media APIs with renegotiation

```text

await updateMedia({
  audio: {
    enable: true,
    direction: 'send' | 'sendrecv',
    constraints?: MediaTrackConstraints
  },
  video: {
    enable: false
    direction: 'none' | 'receive'
  }
})

Either "audio" or "video" is required with "enable" and "direction" properties.
The "constraints" can only be passed if the "enable" is "true".

await setVideoDirection('send' | 'sendrecv' | 'none' | 'receive')

await setAudioDirection('send' | 'sendrecv' | 'none' | 'receive')

```
